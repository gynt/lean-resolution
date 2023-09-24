import { repositoryFromYaml } from "../Repository";
import { Tree } from "./Tree";


describe('Tree resolution: >=', () => {

  const repoYaml = `
  A@0.0.1: {}
  A@0.0.2: {}
  A@0.0.3: {}
  B@0.0.1:
    A: =0.0.1
  B@0.0.2:
    A: =0.0.2
  B@0.0.3:
    A: =0.0.3
  C@0.0.1:
    A: =0.0.1
    B: =0.0.1
  C@0.0.2:
    A: =0.0.2
    B: =0.0.2
  C@0.0.3:
    A: =0.0.3
    B: =0.0.3
  `

  const repository = repositoryFromYaml(repoYaml)

  let tree: Tree = Tree.buildInitialTree(repository)



  test('tree creation', () => {
    tree = Tree.buildInitialTree(repository)
    expect(tree.ok).toBe(true);
  });

})