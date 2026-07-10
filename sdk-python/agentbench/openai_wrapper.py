"""
OpenAI client wrapper for automatic tracing.

Wraps an ``openai.OpenAI`` instance to intercept ``chat.completions.create``
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


class OpenAIWrapper:
    """
    Wraps ``openai.OpenAI`` client for automatic tracing of chat completions.

    Parameters
    ----------
    client : openai.OpenAI
        An existing OpenAI client instance.
    tracer : Tracer
        The tracer to record LLM calls into.

    Examples
    --------
    >>> import openai
    >>> from agentbench import Tracer
    >>> from agentbench.openai_wrapper import OpenAIWrapper
    >>>
    >>> tracer = Tracer()
    >>> tracer.start_trace(run_id="run-1")
    >>> client = openai.OpenAI()
    >>> wrapped = OpenAIWrapper(client, tracer)
    >>> response = wrapped.chat.completions.create(
    ...     model="gpt-4o",
    ...     messages=[{"role": "user", "content": "Hello"}],
    ... )
    """

    def __init__(self, client: Any, tracer: Tracer):
        self._client = client
        self._tracer = tracer

    @property
    def chat(self) -> _ChatCompletionsWrapper:
        """Access the chat completions namespace (wrapped)."""
        return _ChatCompletionsWrapper(self._client, self._tracer)

    def __getattr__(self, name: str) -> Any:
        """Fall through to the underlying client for non-wrapped APIs."""
        return getattr(self._client, name)


class _ChatCompletionsWrapper:
    """Wraps ``client.chat.completions`` to trace ``create`` calls."""

    def __init__(self, client: Any, tracer: Tracer):
        self._client = client
        self._tracer = tracer

    @property
    def completions(self) -> "_ChatCompletionsWrapper":
        """Allow ``.chat.completions.create(...)`` chaining."""
        return self

    def create(self, **kwargs: Any) -> Any:
        """
        Call the underlying ``chat.completions.create`` and trace the result.

        Parameters
        ----------
        **kwargs
            All arguments accepted by the OpenAI chat completions API.

        Returns
        -------
        openai.types.chat.ChatCompletion
            The API response (unmodified).
        """
        provider = "openai"
        model = kwargs.get("model", "unknown")
        messages_raw = kwargs.get("messages", [])
        tools_raw = kwargs.get("tools")
        temperature = kwargs.get("temperature", 0.0)
        max_tokens_val = kwargs.get("max_tokens", kwargs.get("max_completion_tokens", 1024))
        top_p = kwargs.get("top_p")
        stop = kwargs.get("stop")
        seed = kwargs.get("seed")

        # Build LLMRequest from kwargs
        messages = [_message_from_openai(m) for m in messages_raw]
        llm_request = LLMRequest(
            provider=provider,
            model=model,
            messages=messages,
            tools=None,  # simplified: not fully converting tool schemas here
            temperature=temperature,
            max_tokens=max_tokens_val,
            top_p=top_p,
            stop=stop if isinstance(stop, list) else ([stop] if stop else None),
            seed=seed,
        )

        started = time.perf_counter()
        try:
            response = self._client.chat.completions.create(**kwargs)
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

        # Extract usage
        usage = TokenUsage()
        if hasattr(response, "usage") and response.usage:
            usage = TokenUsage(
                prompt_tokens=getattr(response.usage, "prompt_tokens", 0),
                completion_tokens=getattr(response.usage, "completion_tokens", 0),
                total_tokens=getattr(response.usage, "total_tokens", 0),
            )

        # Extract content
        content: Optional[str] = None
        if response.choices:
            choice = response.choices[0]
            msg = getattr(choice, "message", None)
            if msg:
                content = getattr(msg, "content", None)

        finish_reason = "stop"
        if response.choices:
            finish_reason = getattr(response.choices[0], "finish_reason", "stop")

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


def _message_from_openai(msg: Any) -> Message:
    """Convert an OpenAI message dict/object to a Message model."""
    if isinstance(msg, dict):
        return Message(
            role=msg.get("role", "user"),
            content=msg.get("content"),
            name=msg.get("name"),
        )
    return Message(
        role=getattr(msg, "role", "user"),
        content=getattr(msg, "content", None),
        name=getattr(msg, "name", None),
    )
