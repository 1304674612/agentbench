"""
Anthropic client wrapper for automatic tracing.

Wraps an ``anthropic.Anthropic`` instance to intercept ``messages.create``
calls and record them via a :class:`Tracer`.
"""

from __future__ import annotations

import time
from typing import Any, Optional

from agentbench.tracer import Tracer
from agentbench.types import (
    LLMRequest,
    LLMResponse,
    Message,
    TokenUsage,
)


class AnthropicWrapper:
    """
    Wraps ``anthropic.Anthropic`` client for automatic tracing of messages.

    Parameters
    ----------
    client : anthropic.Anthropic
        An existing Anthropic client instance.
    tracer : Tracer
        The tracer to record LLM calls into.

    Examples
    --------
    >>> import anthropic
    >>> from agentbench import Tracer
    >>> from agentbench.anthropic_wrapper import AnthropicWrapper
    >>>
    >>> tracer = Tracer()
    >>> tracer.start_trace(run_id="run-1")
    >>> client = anthropic.Anthropic()
    >>> wrapped = AnthropicWrapper(client, tracer)
    >>> response = wrapped.messages.create(
    ...     model="claude-sonnet-4-20250514",
    ...     max_tokens=1024,
    ...     messages=[{"role": "user", "content": "Hello"}],
    ... )
    """

    def __init__(self, client: Any, tracer: Tracer):
        self._client = client
        self._tracer = tracer

    @property
    def messages(self) -> _MessagesWrapper:
        """Access the messages namespace (wrapped)."""
        return _MessagesWrapper(self._client, self._tracer)

    def __getattr__(self, name: str) -> Any:
        """Fall through to the underlying client for non-wrapped APIs."""
        return getattr(self._client, name)


class _MessagesWrapper:
    """Wraps ``client.messages`` to trace ``create`` calls."""

    def __init__(self, client: Any, tracer: Tracer):
        self._client = client
        self._tracer = tracer

    def create(self, **kwargs: Any) -> Any:
        """
        Call the underlying ``messages.create`` and trace the result.

        Parameters
        ----------
        **kwargs
            All arguments accepted by the Anthropic Messages API.

        Returns
        -------
        anthropic.types.Message
            The API response (unmodified).
        """
        provider = "anthropic"
        model = kwargs.get("model", "unknown")
        messages_raw = kwargs.get("messages", [])
        system = kwargs.get("system")
        tools_raw = kwargs.get("tools")
        temperature = kwargs.get("temperature", 0.0)
        max_tokens_val = kwargs.get("max_tokens", 1024)
        top_p = kwargs.get("top_p")
        stop = kwargs.get("stop_sequences")

        # Build messages list, prepending system as a system message
        messages: list[Message] = []
        if system:
            if isinstance(system, str):
                messages.append(Message(role="system", content=system))
            elif isinstance(system, list):
                # Anthropic's system can be a list of text blocks
                text = "\n".join(
                    block.get("text", "") if isinstance(block, dict) else getattr(block, "text", "")
                    for block in system
                )
                messages.append(Message(role="system", content=text))
        messages.extend(_message_from_anthropic(m) for m in messages_raw)

        llm_request = LLMRequest(
            provider=provider,
            model=model,
            messages=messages,
            tools=None,  # simplified
            temperature=temperature,
            max_tokens=max_tokens_val,
            top_p=top_p,
            stop=stop if isinstance(stop, list) else ([stop] if stop else None),
        )

        started = time.perf_counter()
        try:
            response = self._client.messages.create(**kwargs)
        except Exception as exc:
            duration_ms = (time.perf_counter() - started) * 1000
            self._tracer.trace_llm_call(
                provider=provider,
                model=model,
                request=llm_request,
                response=LLMResponse(model=model, usage=TokenUsage()),
                duration_ms=duration_ms,
                error=exc,
            )
            raise

        duration_ms = (time.perf_counter() - started) * 1000

        usage = TokenUsage()
        if hasattr(response, "usage") and response.usage:
            usage = TokenUsage(
                prompt_tokens=getattr(response.usage, "input_tokens", 0),
                completion_tokens=getattr(response.usage, "output_tokens", 0),
                total_tokens=(
                    getattr(response.usage, "input_tokens", 0)
                    + getattr(response.usage, "output_tokens", 0)
                ),
            )

        # Extract text content
        content: Optional[str] = None
        if response.content:
            text_blocks = [
                block.text
                for block in response.content
                if hasattr(block, "text")
            ]
            content = "\n".join(text_blocks) if text_blocks else None

        finish_reason = getattr(response, "stop_reason", "end_turn") or "end_turn"

        llm_response = LLMResponse(
            content=content,
            finish_reason=finish_reason,
            usage=usage,
            model=model,
        )

        self._tracer.trace_llm_call(
            provider=provider,
            model=model,
            request=llm_request,
            response=llm_response,
            duration_ms=duration_ms,
        )

        return response


def _message_from_anthropic(msg: Any) -> Message:
    """Convert an Anthropic message dict/object to a Message model."""
    if isinstance(msg, dict):
        return Message(
            role=msg.get("role", "user"),
            content=msg.get("content"),
        )
    return Message(
        role=getattr(msg, "role", "user"),
        content=getattr(msg, "content", None),
    )
