import { Dependency } from "../Dependency";
import { Node } from "./Node";

export class Edge {
  from: Node;
  spec: Dependency;
  to?: Node;

  constructor(from: Node, spec: Dependency, to?: Node) {
    this.from = from;
    this.spec = spec;
    this.to = to;
  }

  get id() {
    return `${this.from.spec.id}: ${this.spec.name} ${this.spec.versionRange}`
  }

  get resolved() {
    return this.to !== undefined
  }

  isValidTarget(n: Node) {
    return this.spec.isSatisfiedBy(n.spec)
  }

  /**
   * Invalid in the general sense
   * 
   * @param n 
   */
  isConflicting(n: Node) {
    // Attention: this might seem odd, but it leads to a nice filter logic?
    if (n.spec.name !== this.spec.name) return true;

    return !this.spec.isSatisfiedBy(n.spec)
  }
}