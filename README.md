# lean-resolution
Lean typescript library for dependency resolution

## Dependency resolution
Dependency resolution is a crucial process in package management systems, ensuring that the required versions of packages and their dependencies are compatible and can be installed successfully. Let's walk through the steps for resolving dependencies based on the provided packages and their versions:

### Start with the Initial Request:
The dependency resolution process begins with a specific request, such as installing a particular package or setting up a project.

### Identify the Initial Package:
Identify the package requested in the initial request. Let's say the initial request is to install Package C version 0.0.1.

### Fetch Package Information:
Retrieve the metadata and dependency information for Package C version 0.0.1. This metadata will include details about Package C and its dependencies, specifically Package B version 0.0.2 and Package A version 0.0.2.

### Resolve Direct Dependencies:
Resolve the direct dependencies of Package C version 0.0.1. In this case, it depends on Package B version 0.0.2 and Package A version 0.0.2.

### Fetch Dependency Information for Package B (0.0.2):
Retrieve the metadata and dependency information for Package B version 0.0.2. Check its dependencies, which include Package A version 0.0.1 and above.

### Resolve Package B's Dependencies:
Resolve the dependencies of Package B version 0.0.2. It requires Package A version 0.0.1 and above.

### Fetch Dependency Information for Package A (0.0.2):
Retrieve the metadata and dependency information for Package A version 0.0.2.

### Resolve Package A's Dependencies:
Since Package A has no dependencies, the resolution process for Package A is complete.

### Check Compatibility and Versions:
Ensure that the resolved package versions are compatible with each other based on the specified version requirements (e.g., Package B version 0.0.2 requires Package A version 0.0.1 and above). If conflicts or incompatibilities are detected, the resolution may fail or attempt to find alternative versions that satisfy the dependencies.

### Installation and Setup:
Proceed to install the resolved packages and set up the project with the appropriate versions and configurations based on the resolved dependency tree.

By following these steps, the dependency resolution process ensures that the specified packages and their dependencies are resolved and installed in a compatible and consistent manner within the project.
