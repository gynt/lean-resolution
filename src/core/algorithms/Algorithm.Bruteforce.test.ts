import { repositoryFromYaml } from "../../Repository"
import { Tree } from "../Tree"
import { BruteforceAlgorithm } from "./Bruteforce"

describe('Brute force', () => {

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
  
    const packageId = 'C@0.0.3'
  
    const tree: Tree = new Tree(repository)

    const rootNode = tree.nodeForID(packageId)


    test('brute force', () => {

        const bfa = new BruteforceAlgorithm(tree, rootNode)
        const solution = bfa.solve()

      expect(solution).toBeTruthy()
      expect(solution!.map((n) => `${n.id}`).join(', ')).toBe("A@0.0.2, B@0.0.2, C@0.0.3")
    })
  
  })