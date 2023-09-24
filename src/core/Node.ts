import { Dependency } from "../Dependency";
import { Package } from "../Package";
import { Edge } from "./Edge";

export class Node {
  edgesIn: Edge[]
  edgesOut: Edge[]
  spec: Package

  constructor(spec: Package) {
    this.spec = spec
    this.edgesIn = []
    this.edgesOut = spec.dependencies.map((d: Dependency) => {
      return new Edge(this, d)
    })
  }

  get out() {
    return this.edgesOut
  }

  get in() {
    return this.edgesIn
  }

  get id() {
    return this.spec.id
  }

  toString() {
    return `${this.spec.id}`
  }
}