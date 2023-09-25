import { repositoryFromYaml } from "../../Repository"
import { Tree } from "../Tree"

describe('Difficult problem #1', () => {

    const repoYaml = `

    A@0.0.1: {}
    
    A@0.0.2: {}
    
    A@0.0.3: {}
    
    B@0.0.1:
      A: =0.0.1

    B@0.0.2:
      A: =0.0.2
  
    # Trouble statement is here, A@0.0.1 conflicts...
    B@0.0.3:
      A: "=0.0.1"
    
    C@0.0.1:
      A: =0.0.1
      B: =0.0.1
    C@0.0.2:
      A: =0.0.2
      B: =0.0.2
    C@0.0.3:
    # ...with A>=0.0.2
      A: ">=0.0.2"
      B: ">=0.0.2"
    `
  
    const repository = repositoryFromYaml(repoYaml)
  
    const packageIds = ['C@0.0.3']
  
    const tree: Tree = Tree.buildInitialTree(repository)
  
    // TODO
    // Actually, there is a solution if B@0.0.2 is selected.
    // The only algorithm I can think of which would reach this conclusion
    // is a general algorithm
    // that keeps track of all possible packages for a dependency requirement
    // and tries them one by one (highest version first).
    // That sounds expensive!
    test('solving', () => {
      expect(() => {
        tree.solve(packageIds.map((pid) => tree.nodeForID(pid).spec))
      }).toThrowError('Could not solve dependency A. Conflicting packages required: A: >=0.0.2 (required by C@0.0.3), A: 0.0.1 (required by B@0.0.3)')
    })
  
    // const solution = tree.fixBruteForce(tree.nodeForID(packageIds[0]))
  })