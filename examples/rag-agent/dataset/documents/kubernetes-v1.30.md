# Kubernetes v1.30 Release Notes

## Overview

Kubernetes v1.30 (codename **"Uwubernetes"**) includes 45 enhancements: 14 graduating to Stable, 15 to Beta, and 16 new Alpha features.

## Major Stable Features

- **Pod Scheduling Readiness**: workloads can signal when they are ready to be scheduled
- **Service Traffic Distribution**: topology-aware routing decisions
- **Structured Authentication Config** graduates to Stable

## Beta Features

- **Sidecar Containers**: restartable init containers for service mesh proxies, logging agents, and infrastructure sidecars. Sidecar containers start before main containers and stop after them.
- **Node Log Query**: query service logs across nodes using kubectl

## Removals

- In-tree cloud provider integrations for **vSphere** and **OpenStack** removed
- Full transition to external cloud controller managers

## Key Improvements

- 45 total enhancements across the project
- Improved scheduling with Pod Scheduling Readiness
- Better service mesh support with Sidecar Containers graduation
