import { Package } from "../Package";
import { Repository } from "../Repository";
import { Edge } from "./Edge";
import { Node } from "./Node";

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
        const p = e.spec.maxSatisfyingPackage(repository)

        if (p === undefined) {
          tree.state = 'ERROR'
          tree.errors.push(`No valid package found for dependency: ${e.spec.toString()} (required by ${e.from.id})`)

          return
        }

        tree.setTargetForEdge(e, tree.nodeForPackage(p))

      })
    })

    return tree;
  }
}