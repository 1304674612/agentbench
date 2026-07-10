# Python 3.13 Release Notes — What's New

## Free-Threaded CPython (Experimental)

Python 3.13 introduces an experimental free-threaded build mode that **disables the Global Interpreter Lock (GIL)**, allowing threads to run in parallel on multiple CPU cores. This is the most significant change to CPython's concurrency model since its inception. The feature must be enabled at build time with the `--disable-gil` flag.

## JIT Compiler

A new **Just-In-Time (JIT) compiler** was added, based on a copy-and-patch technique. It provides speedups of 2-9% on the standard benchmark suite. The JIT is enabled by default on supported platforms.

## Typing Improvements

- **TypeIs** for type narrowing in user-defined type guard functions
- **ReadOnly** for TypedDict, preventing mutation of specific keys
- Improved type inference for generic classes

## Removed Modules

- `lib2to3` (deprecated since Python 3.11)
- `tkinter.tix` (deprecated since Python 3.6)
- `audioop` module

## Platform Support

- Official **Windows ARM64** builds
- Improved **macOS Apple Silicon** support with optimized memory allocators
- Better error messages with suggestions for common mistakes
