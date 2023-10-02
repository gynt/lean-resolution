import { rcompare, valid } from "semver";
import { Package } from "../Package";
import { Repository } from "../Repository";
import { Edge } from "./Edge";
import { Node } from "./Node";
import { Dependency } from "../Dependency";
import { SimpleConflictSolver } from "./algorithms/SimpleConflictSolver";
import { BruteforceAlgorithm } from "./algorithms/Bruteforce";

export type DependencyCollection = {
  initiator: Node,
  dependencies: Node[]
}

export type EdgeConflict = {
  nodeName: string,
  edges: Edge[]
}

export type NodeConflict = {
  nodeName: string,
  nodes: Node[]
}

export type ResolutionStrategy = 'simple' | 'bruteforce'

export class Tree {

  nodes: { [name: string]: Node }
  state: 'OK' | 'ERROR'
  errors: string[]

  constructor(repository: Repository) {
    this.nodes = Object.fromEntries(repository.map((p) => {
      return [p.id, new Node(p)]
    }))
    this.state = 'OK'
    this.errors = []
  }

  get ok() {
    return this.state === 'OK'
  }

  get nodeObjects() {
    return Object.values(this.nodes)
  }

  get packages() {
    return this.nodeObjects.map((n) => n.spec)
  }

  get edges() {
    return this.nodeObjects.map((n) => n.edgesOut).flat()
  }

  nodeForID(id: string) {
    return this.nodes[id]
  }

  nodeForPackage(p: Package) {
    return this.nodeForID(p.id)
  }

  clearTargetForEdge(e: Edge) {

    if (e.to === undefined) {
      this.state = "ERROR"
      this.errors.push(`call set first ${e.spec.toString()}`)
      throw `call set first ${e.spec.toString()}`
    }

    const n = e.to
    e.to = undefined

    const i = n.in.indexOf(e)
    if (i !== -1) {
      n.in.splice(i, 1)
    }

    return n
  }

  setTargetForEdge(e: Edge, n: Node) {

    if (e.to !== undefined) {
      this.state = "ERROR"
      this.errors.push(`call clear first ${n.spec.id}`)
      throw `call clear first ${n.spec.id}`
    }

    e.to = n
    if (n.in.indexOf(e) === -1) {
      n.in.push(e)
    }

    return n
  }

  conflictingEdges(nodes: Node[]) {
    const nodeNames: { [name: string]: Edge[] } = {}
    nodes.forEach((n) => {

      n.edgesOut.forEach((e) => {
        if (nodeNames[e.spec.name] === undefined) {
          nodeNames[e.spec.name] = []
        }

        nodeNames[e.spec.name].push(e)
      })


    })

    const conflicts = Object.fromEntries(Object.entries(nodeNames).filter(([name, edges]) => {
      const nodeSet: Node[] = []

      edges.forEach((e) => {
        if (nodeSet.indexOf(e.to!) === -1) {
          nodeSet.push(e.to!)
        }
      })

      // More than one node is selected with the same node name
      return nodeSet.length > 1
    }))

    Object.entries(conflicts).forEach(([name, edges]) =>
      // In place!
      edges.sort((a, b) => rcompare(a.to!.spec.version, b.to!.spec.version))
    )

    const sortedNames: string[] = []
    // topological sort assumes a resolved tree (logically)...
    this.topologicalSort(nodes).forEach((n) => {
      if (sortedNames.indexOf(n.spec.name) === -1) {
        sortedNames.push(n.spec.name)
      }
    })

    sortedNames.reverse()

    return sortedNames.filter((n) => Object.keys(conflicts).indexOf(n) !== -1).map((n) => {
      return {
        nodeName: n,
        edges: conflicts[n]
      } as EdgeConflict
    })

  }

  conflictingPackages(nodes: Node[]): NodeConflict[] {
    const nodeNames: { [name: string]: Node[] } = {}
    nodes.forEach((n) => {
      if (nodeNames[n.spec.name] === undefined) {
        nodeNames[n.spec.name] = []
      }

      nodeNames[n.spec.name].push(n)
    })

    const longerThanOne = Object.entries(nodeNames).filter(([name, nodes]) => nodes.length > 1)

    return longerThanOne.map(([name, nodes]) => {
      return {
        nodeName: name,
        nodes
      } as NodeConflict
    })
  }

  isValidSolution(nodes: Node[]) {
    return this.conflictingPackages(nodes).length === 0
  }

  // TODO: Should be written for multiple packages too? Usually there is an array of initialPackages
  allDependenciesForNode(initialNode: Node, options?: { allowUnresolvedEdges: boolean }) {

    options = (options || { allowUnresolvedEdges: false })

    const dependencies: Node[] = []

    const todo = [initialNode]
    const visited: Node[] = []

    while (todo.length > 0) {
      const n = todo.splice(0, 1)[0]

      if (dependencies.indexOf(n) === -1) {
        dependencies.push(n)
      }

      n.out.forEach((e) => {

        const target = e.to

        // This can happen if Edge e wasn't resolved yet.
        // here we allow it.
        if (target === undefined) {
          if (!options!.allowUnresolvedEdges) {
            throw Error(`Encountered unresolved edge: ${e.id}`)
          }

          // If allowed, we just "continue" with the next edge
          return
        }

        if (visited.indexOf(target) === -1) {
          todo.push(target)
        }

      })
    }

    return dependencies
  }

  allDependenciesForPackage(p: Package) {
    return this.allDependenciesForNode(this.nodeForPackage(p))
  }

  topologicalSort(ns: Node[]) {

    const result: Node[][] = []

    const ignoreList: Node[] = []

    while (ignoreList.length < ns.length) {

      const todo = ns.filter((n) => ignoreList.indexOf(n) === -1)

      const leaves = todo.filter((n) => {
        return n.edgesOut.filter((e) => ignoreList.indexOf(e.to!) === -1).length === 0
      })

      if (leaves.length === 0) {
        throw `Are all required packages included? Dependency cycle detected? Could not resolve ${todo.map((n) => n.id).join(', ')}`
      }

      ignoreList.push(...leaves)

      result.push(leaves)
    }

    return result.flat()
  }

  fix(node: Node, strategy: ResolutionStrategy) {
    switch (strategy) {
      case 'simple': {
        return new SimpleConflictSolver(this, node).solve()
      }
      case 'bruteforce': {
        return new BruteforceAlgorithm(this, node).solve()
      }
      default:
        throw Error(`unknown strategy: ${strategy}`)
    }
  }

  fixPackage(initialPackage: Package, strategy: ResolutionStrategy) {
    return this.fix(this.nodeForPackage(initialPackage), strategy)
  }

  setInitialTargetForEdge(e: Edge) {
    const p = e.spec.maxSatisfyingPackage(this.nodeObjects.map((n) => n.spec))

    if (p === undefined) {
      this.state = 'ERROR'
      this.errors.push(`No valid package found for dependency: ${e.spec.toString()} (required by ${e.from.id})`)

      return
    }

    this.setTargetForEdge(e, this.nodeForPackage(p))

  }

  solveForNode(rootNode: Node, strategies?: ResolutionStrategy[]) {
    strategies = strategies || ['simple', 'bruteforce']

    rootNode.edgesOut.forEach((e) => this.setInitialTargetForEdge(e))

    let solution = this.allDependenciesForNode(rootNode)

    if (this.isValidSolution(solution)) {
      return this.topologicalSort(solution)
    }

    for (const strategy of strategies) {
      solution = this.fix(rootNode, strategy)

      if (this.isValidSolution(solution)) {
        return this.topologicalSort(solution)
      }
    }

    const msg = `Could not fix dependency issues: ${rootNode.edgesOut.map((e) => e.spec.toString()).join(', ')}`
    this.state = "ERROR"
    this.errors.push(msg)

    throw Error(msg)
  }

  solve(packages: Package[], strategies?: ResolutionStrategy[]) {
    strategies = strategies || ['simple', 'bruteforce']

    this.setInitialTargetForAllEdges()

    const nodes = packages.map((p) => this.nodeForPackage(p))

    // packages could interdepent, so start with the bottom one first
    const deps = Array.from(new Set(nodes.map((n) => this.allDependenciesForNode(n)).flat()))
    const ns = this.topologicalSort(deps).filter((n) => nodes.indexOf(n) !== -1)

    const fictitiousNode = new Node(new Package('__user__', '0.0.0', ns.map((n) => {
      return new Dependency(n.spec.name, `=${n.spec.version.raw}`)
    })))

    return this.solveForNode(fictitiousNode, strategies).filter((n) => n !== fictitiousNode)
  }

  /**
   * Build an initial tree by finding the max satisfying package available in the repository for each
   * package
   * 
   * @param repository 
   * @returns Tree
   */
  static buildInitialTree(repository: Repository): Tree {
    const tree = new Tree(repository)

    tree.setInitialTargetForAllEdges()

    return tree;
  }

  setInitialTargetForAllEdges() {
    this.nodeObjects.forEach((n) => {
      n.edgesOut.forEach((e) => {
        this.setInitialTargetForEdge(e)
      })
    })
  }

  reset() {
    this.nodeObjects.forEach((n) => {
      n.edgesOut.forEach((e) => {
        if (e.to !== undefined) {
          this.clearTargetForEdge(e)
        }
      })
    })
  }
}