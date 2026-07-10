"""
HTTP client for the AgentBench server API.

Uses httpx for sync and async HTTP communication. Authentication is handled
via the AB_API_KEY environment variable or the api_key constructor parameter.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

import httpx

from agentbench.types import RunResult, Run, RunSummary, Experiment, ExperimentConfig

DEFAULT_BASE_URL = "http://localhost:3000/api/v1"


class AgentBenchError(Exception):
    """Raised when the AgentBench API returns an error response."""

    def __init__(self, message: str, status_code: Optional[int] = None):
        super().__init__(message)
        self.status_code = status_code


class AgentBench:
    """
    HTTP client for the AgentBench server API.

    Parameters
    ----------
    api_key : str, optional
        API key for authentication. Defaults to the AB_API_KEY environment variable.
    base_url : str, optional
        Base URL for the AgentBench API. Defaults to the AB_API_URL environment
        variable, or ``http://localhost:3000/api/v1``.
    timeout : float, optional
        Request timeout in seconds. Defaults to 30.0.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 30.0,
    ):
        self._api_key = api_key or os.environ.get("AB_API_KEY", "")
        self._base_url = (base_url or os.environ.get("AB_API_URL", DEFAULT_BASE_URL)).rstrip("/")
        self._timeout = timeout

        self._client: Optional[httpx.Client] = None
        self._async_client: Optional[httpx.AsyncClient] = None

    @property
    def _headers(self) -> Dict[str, str]:
        h: Dict[str, str] = {"Content-Type": "application/json"}
        if self._api_key:
            h["Authorization"] = f"Bearer {self._api_key}"
        return h

    @property
    def client(self) -> httpx.Client:
        """Synchronous HTTP client (lazily created)."""
        if self._client is None:
            self._client = httpx.Client(
                base_url=self._base_url,
                headers=self._headers,
                timeout=self._timeout,
            )
        return self._client

    @property
    def async_client(self) -> httpx.AsyncClient:
        """Asynchronous HTTP client (lazily created)."""
        if self._async_client is None:
            self._async_client = httpx.AsyncClient(
                base_url=self._base_url,
                headers=self._headers,
                timeout=self._timeout,
            )
        return self._async_client

    def _request(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make a synchronous HTTP request and return parsed JSON."""
        res = self.client.request(method, path, **kwargs)
        return self._handle_response(res)

    async def _request_async(self, method: str, path: str, **kwargs: Any) -> Dict[str, Any]:
        """Make an asynchronous HTTP request and return parsed JSON."""
        res = await self.async_client.request(method, path, **kwargs)
        return self._handle_response(res)

    @staticmethod
    def _handle_response(res: httpx.Response) -> Dict[str, Any]:
        if res.is_success:
            return res.json()  # type: ignore[no-any-return]
        message = f"AgentBench API error: {res.status_code}"
        try:
            body = res.json()
            if isinstance(body, dict) and "error" in body:
                message = body["error"]
        except Exception:
            pass
        raise AgentBenchError(message, res.status_code)

    def close(self) -> None:
        """Close the underlying HTTP clients."""
        if self._client is not None:
            self._client.close()
            self._client = None
        if self._async_client is not None:
            self._async_client.close()
            self._async_client = None

    # ── Runs ──────────────────────────────────────────────────────────────

    def create_run(self, config: Dict[str, Any]) -> RunResult:
        """
        Create and start a new run.

        Parameters
        ----------
        config : dict
            Run configuration matching the API schema.

        Returns
        -------
        RunResult
            The created run's result.
        """
        data = self._request("POST", "/runs", json=config)
        return RunResult(**data)

    async def create_run_async(self, config: Dict[str, Any]) -> RunResult:
        """Async version of :meth:`create_run`."""
        data = await self._request_async("POST", "/runs", json=config)
        return RunResult(**data)

    def get_run(self, run_id: str) -> Run:
        """
        Fetch a single run by ID.

        Parameters
        ----------
        run_id : str
            The run identifier.

        Returns
        -------
        Run
            The run record.
        """
        data = self._request("GET", f"/runs/{run_id}")
        return Run(**data)

    async def get_run_async(self, run_id: str) -> Run:
        """Async version of :meth:`get_run`."""
        data = await self._request_async("GET", f"/runs/{run_id}")
        return Run(**data)

    def list_runs(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[RunSummary]:
        """
        List runs, optionally filtered.

        Parameters
        ----------
        project_id : str, optional
            Filter by project ID.
        status : str, optional
            Filter by run status.
        limit : int
            Maximum number of results (default 20).
        offset : int
            Pagination offset (default 0).

        Returns
        -------
        list of RunSummary
        """
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if project_id:
            params["projectId"] = project_id
        if status:
            params["status"] = status
        data = self._request("GET", "/runs", params=params)
        return [RunSummary(**item) for item in data.get("data", data)]

    async def list_runs_async(
        self,
        project_id: Optional[str] = None,
        status: Optional[str] = None,
        limit: int = 20,
        offset: int = 0,
    ) -> List[RunSummary]:
        """Async version of :meth:`list_runs`."""
        params: Dict[str, Any] = {"limit": limit, "offset": offset}
        if project_id:
            params["projectId"] = project_id
        if status:
            params["status"] = status
        data = await self._request_async("GET", "/runs", params=params)
        return [RunSummary(**item) for item in data.get("data", data)]

    def evaluate_run(self, run_id: str, evaluator: str = "rule") -> Dict[str, Any]:
        """
        Trigger evaluation for a completed run.

        Parameters
        ----------
        run_id : str
            The run identifier.
        evaluator : str
            Evaluator type (default ``"rule"``).

        Returns
        -------
        dict
            Evaluation result.
        """
        return self._request("POST", f"/runs/{run_id}/evaluate", json={"evaluator": evaluator})

    async def evaluate_run_async(self, run_id: str, evaluator: str = "rule") -> Dict[str, Any]:
        """Async version of :meth:`evaluate_run`."""
        return await self._request_async(
            "POST", f"/runs/{run_id}/evaluate", json={"evaluator": evaluator}
        )

    def cancel_run(self, run_id: str) -> Run:
        """Cancel a running run."""
        data = self._request("POST", f"/runs/{run_id}/cancel")
        return Run(**data)

    async def cancel_run_async(self, run_id: str) -> Run:
        """Async version of :meth:`cancel_run`."""
        data = await self._request_async("POST", f"/runs/{run_id}/cancel")
        return Run(**data)

    # ── Projects ──────────────────────────────────────────────────────────

    def create_project(self, name: str, description: Optional[str] = None) -> Dict[str, Any]:
        """Create a new project."""
        body: Dict[str, Any] = {"name": name}
        if description:
            body["description"] = description
        return self._request("POST", "/projects", json=body)

    async def create_project_async(
        self, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async version of :meth:`create_project`."""
        body: Dict[str, Any] = {"name": name}
        if description:
            body["description"] = description
        return await self._request_async("POST", "/projects", json=body)

    def list_projects(self) -> List[Dict[str, Any]]:
        """List all projects."""
        data = self._request("GET", "/projects")
        return data.get("data", data)  # type: ignore[no-any-return]

    async def list_projects_async(self) -> List[Dict[str, Any]]:
        """Async version of :meth:`list_projects`."""
        data = await self._request_async("GET", "/projects")
        return data.get("data", data)  # type: ignore[no-any-return]

    def get_project(self, project_id: str) -> Dict[str, Any]:
        """Fetch a single project by ID."""
        return self._request("GET", f"/projects/{project_id}")  # type: ignore[no-any-return]

    async def get_project_async(self, project_id: str) -> Dict[str, Any]:
        """Async version of :meth:`get_project`."""
        return await self._request_async("GET", f"/projects/{project_id}")  # type: ignore[no-any-return]

    # ── Test Suites ───────────────────────────────────────────────────────

    def create_test_suite(
        self, project_id: str, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Create a new test suite within a project."""
        body: Dict[str, Any] = {"projectId": project_id, "name": name}
        if description:
            body["description"] = description
        return self._request("POST", "/test-suites", json=body)

    async def create_test_suite_async(
        self, project_id: str, name: str, description: Optional[str] = None
    ) -> Dict[str, Any]:
        """Async version of :meth:`create_test_suite`."""
        body: Dict[str, Any] = {"projectId": project_id, "name": name}
        if description:
            body["description"] = description
        return await self._request_async("POST", "/test-suites", json=body)

    # ── Experiments ───────────────────────────────────────────────────────

    def create_experiment(self, config: ExperimentConfig) -> Dict[str, Any]:
        """Create a new A/B experiment."""
        return self._request("POST", "/experiments", json=config.model_dump())

    async def create_experiment_async(self, config: ExperimentConfig) -> Dict[str, Any]:
        """Async version of :meth:`create_experiment`."""
        return await self._request_async(
            "POST", "/experiments", json=config.model_dump()
        )

    def get_experiment(self, experiment_id: str) -> Experiment:
        """Fetch an experiment by ID."""
        data = self._request("GET", f"/experiments/{experiment_id}")
        return Experiment(**data)

    async def get_experiment_async(self, experiment_id: str) -> Experiment:
        """Async version of :meth:`get_experiment`."""
        data = await self._request_async("GET", f"/experiments/{experiment_id}")
        return Experiment(**data)

    # ── Snapshots ─────────────────────────────────────────────────────────

    def create_snapshot(self, run_id: str, tags: Optional[List[str]] = None) -> Dict[str, Any]:
        """Create a snapshot from a run's trace."""
        body: Dict[str, Any] = {"runId": run_id}
        if tags:
            body["tags"] = tags
        return self._request("POST", "/snapshots", json=body)

    async def create_snapshot_async(
        self, run_id: str, tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Async version of :meth:`create_snapshot`."""
        body: Dict[str, Any] = {"runId": run_id}
        if tags:
            body["tags"] = tags
        return await self._request_async("POST", "/snapshots", json=body)

    # ── Health ────────────────────────────────────────────────────────────

    def health(self) -> Dict[str, Any]:
        """Check if the AgentBench server is healthy."""
        return self._request("GET", "/health")  # type: ignore[no-any-return]

    async def health_async(self) -> Dict[str, Any]:
        """Async version of :meth:`health`."""
        return await self._request_async("GET", "/health")  # type: ignore[no-any-return]
