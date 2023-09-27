import { rcompare } from "semver";
import { Edge } from "../Edge";
import { Node } from "../Node";
import { NodeConflict, Tree } from "../Tree";

export type Clash = {
  name: string,
  nodes: Node[]
}

export class BruteforceAlgorithm {
  tree: Tree;
  rootNode: Node;
  state: 'NOT_STARTED' | 'RUNNING' | 'CLASH' | 'SOLVED' | 'UNSOLVED' | 'ERROR';
  messages: string[]

  constructor(tree: Tree, rootNode: Node) {
    this.tree = tree
    this.rootNode = rootNode
    this.state = 'NOT_STARTED'
    this.messages = []
  }

  get solved() {
    return this.state === 'SOLVED'
  }

  nodesSoFar() {
    return this.tree.allDependenciesForNode(this.rootNode, { allowUnresolvedEdges: true })
  }

  unresolvedEdges() {
    const nodes = this.nodesSoFar()

    return nodes.map((n) => n.edgesOut.filter((e) => e.to === undefined)).flat()
  }

  done() {
    return this.unresolvedEdges().length === 0
  }

  hasClashes() {
    return this.clashes(this.nodesSoFar()).length > 0
  }

  clashes(nodes: Node[]): NodeConflict[] {
    return this.tree.conflictingPackages(nodes)
  }

  tryEdgeOptions(edges: Edge[], index: number) {

    if (this.solved) return

    if (this.done()) {
      this.state = 'SOLVED'
      return
    }

    // Has clashes, return
    if (this.hasClashes()) {
      return
    }

    if (index >= edges.length) {
      throw Error(`How did we get here? We should have noticed we are solved!`)
    }

    // Next in line to solve
    const edge: Edge = edges[index]

    // This is a broad sweep through the repo, but I guess that is what
    // "bruteforce" means
    const options = edge.spec.allSatisfyingPackages(this.tree.packages)
    options.sort((a, b) => {
      return rcompare(a.version, b.version)
    })

    for (const option of options) {

      if (edge.to !== undefined) this.tree.clearTargetForEdge(edge)
      this.tree.setTargetForEdge(edge, this.tree.nodeForPackage(option))

      // This check is done early, to avoid unnecessary push and splice
      if (this.hasClashes()) {
        this.tree.clearTargetForEdge(edge)

        continue
      }

      // At this point we have a succesful option

      // Add the todos at the end of the list
      const todos = edge.to!.edgesOut
      edges.push(...todos)

      // Try to solve the next edge
      this.tryEdgeOptions(edges, index + 1)

      if (this.solved) {
        return
      }

      // Remove the todos
      edges.splice(edges.length - todos.length - 1, todos.length)
    }
  }

  get solution() {
    return this.tree.topologicalSort(this.tree.allDependenciesForNode(this.rootNode))
  }

  solve() {
    this.tree.reset()

    this.tryEdgeOptions([...this.rootNode.edgesOut], 0)

    if (this.solved) {
      return this.solution
    }

    throw Error(`Could not solve for ${this.rootNode.id}`)
  }
}