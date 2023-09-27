// This conflict solver is called Simple because it only solves
// conflicts two dependencies that prefer the same package with a different version
// by finding a version that satisfies both dependencies.
// It fails if a higher order node that has no conflicts should change a dependency preference
// to fix a conflict down the line

import { rcompare } from "semver"
import { Node } from "../Node"
import { Tree } from "../Tree"

export class SimpleConflictSolver {
  tree: Tree
  rootNode: Node
  state: "ERROR" | "NOT_STARTED" | "OK"
  messages: string[]
  maxVisitsPerNodeName: number

  constructor(tree: Tree, rootNode: Node) {
    this.tree = tree
    this.rootNode = rootNode
    this.state = "NOT_STARTED"
    this.messages = []
    this.maxVisitsPerNodeName = 3
  }

  solve() {
    this.tree.reset()

    this.tree.setInitialTargetForAllEdges()

    let deps = this.tree.allDependenciesForNode(this.rootNode)

    let conflicts = this.tree.conflictingEdges(deps)

    const initialConflictCount = conflicts.length

    const visits: { [nodeName: string]: number } = Object.fromEntries(deps.map((d) => [d.spec.name, 0]))

    while (conflicts.length > 0) {

      if (conflicts.length > initialConflictCount) {
        const msg = `Infinite loop prevented. More conflicts caused (${conflicts.length}) than solved ${initialConflictCount}!`

        this.messages.push(msg)
      }



      const conflict = conflicts[0]

      const conflictingEdges = conflict.edges

      const nodeName = conflictingEdges[0].spec.name

      visits[nodeName] += 1

      if (visits[nodeName] > this.maxVisitsPerNodeName) {

        const msg = `Infinite loop prevented. Node was visited too many times ${nodeName}!`

        this.messages.push(msg)
        this.state = "ERROR"
        throw Error(msg)
      }

      const candidates = this.tree.nodeObjects.filter((n) => {
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
            if (e.to !== undefined) this.tree.clearTargetForEdge(e)
            this.tree.setTargetForEdge(e, candidate)
          })

          solved = true

          break
        }

      }

      if (!solved) {
        throw Error(`Could not solve dependency ${nodeName}. Conflicting packages required: ${conflictingEdges.map((e) => {
          return `${e.spec.name}: ${e.spec.versionRange} (required by ${e.from.id})`
        }).join(', ')}`)
      }

      // This is to refresh everything because the node selections have changed!
      deps = this.tree.allDependenciesForNode(this.rootNode)
      conflicts = this.tree.conflictingEdges(deps)
    }

    return deps
  }
}