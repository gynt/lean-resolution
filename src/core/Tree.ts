import { rcompare, valid } from "semver";
import { Package } from "../Package";
import { Repository } from "../Repository";
import { Edge } from "./Edge";
import { Node } from "./Node";
import { Dependency } from "../Dependency";

export type DependencyCollection = {
  initiator: Node,
  dependencies: Node[]
}

export type NodeConflict = {
  nodeName: string,
  edges: Edge[]
}

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
      } as NodeConflict
    })

  }

  conflictingPackages(nodes: Node[]) {
    const nodeNames: { [name: string]: Node[] } = {}
    nodes.forEach((n) => {
      if (nodeNames[n.spec.name] === undefined) {
        nodeNames[n.spec.name] = []
      }

      nodeNames[n.spec.name].push(n)
    })

    const longerThanOne = Object.entries(nodeNames).filter(([name, nodes]) => nodes.length > 1)

    return longerThanOne
  }

  isValidSelection(nodes: Node[]) {
    return this.conflictingPackages(nodes).length === 0
  }

  // TODO: Should be written for multiple packages too? Usually there is an array of initialPackages
  allDependenciesForNode(initialNode: Node) {
    const dependencies: Node[] = []

    const todo = [initialNode]
    const visited: Node[] = []

    while (todo.length > 0) {
      const n = todo.splice(0, 1)[0]

      if (dependencies.indexOf(n) === -1) {
        dependencies.push(n)
      }

      n.out.forEach((e) => {
        if (!e.resolved) {
          throw `${e.spec.toString()} was not resolved`
        }

        const target = e.to!

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

  fix(node: Node, strategy: 'overlap') {
    let deps = this.allDependenciesForNode(node)

    let conflicts = this.conflictingEdges(deps)

    const initialConflictCount = conflicts.length

    // This can produce an infinite loop,
    // TODO: improve by moving down a topological sort!
    // Or by ensuring the conflict count does not go up...
    while (conflicts.length > 0) {

      if (conflicts.length > initialConflictCount) {
        const msg = `Infinite loop prevented. More conflicts caused (${conflicts.length}) than solved ${initialConflictCount}!`

        this.state = "ERROR"
        this.errors.push()
        throw Error(msg)
      }

      const conflict = conflicts[0]

      const conflictingEdges = conflict.edges

      const nodeName = conflictingEdges[0].spec.name

      const candidates = this.nodeObjects.filter((n) => {
        return n.spec.name == nodeName
      })

      candidates.sort((a, b) => {
        return rcompare(a.spec.version, b.spec.version)
      })

      let solved = false

      while (candidates.length > 0) {

        const candidate = candidates.splice(0, 1)[0]

        const validity = conflictingEdges.map((e) => e.isValidTarget(candidate))

        if (validity.length === validity.filter((v) => v === true).length) {

          // Set this candidate!
          conflictingEdges.forEach((e) => {
            if (e.to !== undefined) this.clearTargetForEdge(e)
            this.setTargetForEdge(e, candidate)
          })

          solved = true

          break
        }

      }

      if (!solved) {
        throw Error(`Could not solve dependency ${nodeName}. Conflicting edges: ${conflictingEdges.map((e) => {
          return e.spec.toString()
        }).join(', ')}`)
      }

      // This is to refresh everything because the node selections have changed!
      deps = this.allDependenciesForNode(node)
      conflicts = this.conflictingEdges(deps)
    }

    return deps
  }

  fixPackage(initialPackage: Package, strategy: 'overlap') {
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

  solve(packages: Package[]) {

    const nodes = packages.map((p) => this.nodeForPackage(p))

    // packages could interdepent, so start with the bottom one first
    const deps = Array.from(new Set(nodes.map((n) => this.allDependenciesForNode(n)).flat()))
    const ns = this.topologicalSort(deps).filter((n) => nodes.indexOf(n) !== -1)

    const fictitiousNode = new Node(new Package('__user__', '0.0.0', ns.map((n) => {
      return new Dependency(n.spec.name, `=${n.spec.version.raw}`)
    })))

    fictitiousNode.edgesOut.forEach((e) => this.setInitialTargetForEdge(e))

    const all = this.allDependenciesForNode(fictitiousNode)

    if (this.isValidSelection(all)) {
      return this.topologicalSort(all)
    }

    const all2 = this.fix(fictitiousNode, 'overlap')

    if (!this.isValidSelection(all2)) {
      this.state = "ERROR"
      this.errors.push(`Could not fix dependency issues: ${fictitiousNode.edgesOut.map((e) => e.spec.toString()).join(', ')}`)
    }

    return this.topologicalSort(all2.filter((n) => n !== fictitiousNode))
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

    tree.nodeObjects.forEach((n) => {
      n.edgesOut.forEach((e) => {
        tree.setInitialTargetForEdge(e)

      })
    })

    return tree;
  }
}