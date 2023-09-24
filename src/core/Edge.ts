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

  get resolved() {
    return this.to !== undefined
  }
}