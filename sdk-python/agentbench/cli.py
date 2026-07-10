"""
Command-line interface for AgentBench.

Provides ``agentbench run``, ``agentbench test``, ``agentbench init``,
and ``agentbench --version`` subcommands.
"""

from __future__ import annotations

import argparse
import json
import sys
from typing import Optional

from agentbench import __version__


def main(argv: Optional[list[str]] = None) -> None:
    """Entry point for the ``agentbench`` CLI."""
    parser = argparse.ArgumentParser(
        prog="agentbench",
        description="AgentBench — The Regression Testing Framework for AI Agents",
    )
    parser.add_argument(
        "--version",
        action="version",
        version=f"agentbench {__version__}",
    )

    subparsers = parser.add_subparsers(dest="command", help="Available commands")

    # ── run ───────────────────────────────────────────────────────────────
    run_parser = subparsers.add_parser("run", help="Run an agent")
    run_parser.add_argument(
        "agent", nargs="?", default=None, help="Path to a Python module:function (e.g., 'my_agent:main')"
    )
    run_parser.add_argument(
        "--input", "-i", default=None, help="Input data as a JSON string or @filepath"
    )
    run_parser.add_argument(
        "--model", "-m", default=None, help="Model to use (e.g., 'gpt-4o')"
    )
    run_parser.add_argument(
        "--provider", "-p", default="openai", help="LLM provider (default: openai)"
    )
    run_parser.add_argument(
        "--timeout", type=int, default=60000, help="Timeout in milliseconds (default: 60000)"
    )
    run_parser.add_argument(
        "--output", "-o", default=None, help="Write JSON result to a file"
    )

    # ── test ──────────────────────────────────────────────────────────────
    test_parser = subparsers.add_parser("test", help="Run tests")
    test_parser.add_argument(
        "pattern", nargs="?", default="test_*.py", help="Glob pattern for test files"
    )
    test_parser.add_argument(
        "--project", default="default", help="Project ID to run tests against"
    )

    # ── init ──────────────────────────────────────────────────────────────
    init_parser = subparsers.add_parser("init", help="Create a default config file")
    init_parser.add_argument(
        "--name", "-n", default="agentbench", help="Project name (default: agentbench)"
    )
    init_parser.add_argument(
        "--output", "-o", default="agentbench.config.json", help="Output file path"
    )

    args = parser.parse_args(argv)

    if args.command == "run":
        _cmd_run(args)
    elif args.command == "test":
        _cmd_test(args)
    elif args.command == "init":
        _cmd_init(args)
    else:
        parser.print_help()


def _cmd_run(args: argparse.Namespace) -> None:
    """Execute the ``run`` subcommand."""
    from agentbench.runner import Runner
    from agentbench.types import AgentConfig, RunInput, Message

    # Resolve input data
    input_data = None
    if args.input:
        if args.input.startswith("@"):
            with open(args.input[1:], encoding="utf-8") as f:
                input_data = json.load(f)
        else:
            try:
                input_data = json.loads(args.input)
            except json.JSONDecodeError:
                input_data = args.input

    # If an agent path is given, import it
    agent_func = None
    if args.agent:
        import importlib

        module_path, _, func_name = args.agent.partition(":")
        if not func_name:
            print("Error: agent must be specified as 'module:function'", file=sys.stderr)
            sys.exit(1)
        try:
            mod = importlib.import_module(module_path)
            agent_func = getattr(mod, func_name)
        except (ImportError, AttributeError) as exc:
            print(f"Error loading agent: {exc}", file=sys.stderr)
            sys.exit(1)
    else:
        # No agent specified — demonstrate a no-op
        agent_func = lambda x: x  # noqa: E731
        print("No agent specified; running a no-op agent. Pass 'module:function' as argument.")

    agent_config = AgentConfig()
    if args.model:
        agent_config.model = args.model
        agent_config.provider = args.provider  # type: ignore[assignment]

    runner = Runner(agent_config=agent_config)
    result = runner.run(agent_func, input_data or "default")

    output_data = result.model_dump(mode="json")
    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            json.dump(output_data, f, indent=2, default=str)
        print(f"Result written to {args.output}")
    else:
        print(json.dumps(output_data, indent=2, default=str))


def _cmd_test(args: argparse.Namespace) -> None:
    """Execute the ``test`` subcommand."""
    import glob as glob_mod
    import subprocess

    files = glob_mod.glob(args.pattern)
    if not files:
        print(f"No test files found matching '{args.pattern}'", file=sys.stderr)
        sys.exit(1)

    print(f"Found {len(files)} test file(s):")
    for f in files:
        print(f"  {f}")

    # Delegate to pytest when available; otherwise use unittest
    try:
        subprocess.run([sys.executable, "-m", "pytest", *files], check=False)
    except Exception:
        import unittest

        loader = unittest.TestLoader()
        suite = unittest.TestSuite()
        for f in files:
            # Convert path to dotted module name
            dotted = f.replace("/", ".").replace(".py", "")
            suite.addTests(loader.loadTestsFromName(dotted))
        runner = unittest.TextTestRunner(verbosity=2)
        runner.run(suite)


def _cmd_init(args: argparse.Namespace) -> None:
    """Execute the ``init`` subcommand."""
    config = {
        "name": args.name,
        "version": "1",
        "description": "AgentBench project configuration",
        "project": {
            "id": "default",
            "name": args.name,
        },
        "agent": {
            "provider": "openai",
            "model": "gpt-4o",
            "temperature": 0.0,
            "maxTokens": 1024,
        },
        "runs": {
            "timeout": 60000,
            "maxSteps": 10,
            "retries": 0,
            "concurrency": 1,
        },
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)
    print(f"Created config file: {args.output}")


if __name__ == "__main__":
    main()
