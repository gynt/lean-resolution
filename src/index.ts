// https://khalilstemmler.com/blogs/typescript/node-starter-project/

import { Range, SemVer, intersects, maxSatisfying, satisfies } from 'semver'

console.log("Hello world!")


export class Package {
    name: string;
    version: SemVer;
    dependencies: Dependency[]

    constructor(name: string, version: string, dependencies?: Dependency[]) {
        this.name = name;
        this.version = new SemVer(version, {loose: true});
        this.dependencies = dependencies || [];

        if (this.version === null) {
            throw Error(`Illegal version: ${name} ${version}`)
        }
    }

    isFineWith(p: Package) {
        const relevantDependencies = this.dependencies.filter((d) => d.name === p.name)
        if (relevantDependencies.length === 0) return true

        const satisfactions = relevantDependencies.map((d, index) => {
            return {dependency: d, satisfaction: d.isSatisfiedBy(p)}
        })

        const dissatisfied = satisfactions.filter(({dependency, satisfaction}) => satisfaction === false)

        if (dissatisfied.length > 0) {
            return false
        }

        return true
    }

    satisfiesDependency(d: Dependency) {
        return satisfies(this.version, d.versionRange)
    }

    toString() {
        return `${this.name}-${this.version}: ${this.dependencies.map((d) => d.toString()).join(', ')}`
    }
}

export class Dependency {
    name: string;
    versionRange: Range;
    targetPackage?: Package;

    constructor(name: string, versionRange: string) {
        this.name = name;
        this.versionRange = new Range(versionRange, {loose: true});
        this.targetPackage = undefined;

        if (this.versionRange === null) {
            throw Error(`Illegal version range: ${name} ${versionRange}`)
        }
    }

    isSatisfiedBy(p: Package) {
        return p.name == this.name && satisfies(p.version, this.versionRange.range)
    }

    maxSatisfyingPackage(packages: Package[]) {
        const ps = packages.filter((p) => p.name === this.name)
        const ms = maxSatisfying(ps.map((p) => p.version), this.versionRange.range)

        return ps.filter((p) => p.version === ms).at(0)
    }

    intersectsDependency(d: Dependency) {
        return intersects(this.versionRange.range, d.versionRange.range)
    }

    toString() {
        const tp = `${this.targetPackage !== undefined ? `${this.targetPackage.name}-${this.targetPackage.version}` : ''}`
        return `${this.name}: ${this.versionRange.range} (${tp})`
    }
}


const A001 = new Package('A', '0.0.1')
const A002 = new Package('A', '0.0.2')
const B001 = new Package('B', '0.0.1', [ new Dependency('A', '==0.0.1') ])
const B002 = new Package('B', '0.0.2', [ new Dependency('A', '>=0.0.1') ])
const C001 = new Package('C', '0.0.1', [ new Dependency('B', '==0.0.1'), new Dependency('A', '==0.0.2') ])

const packages = [A001, A002, B001, B002, C001]

// console.log(packages)
// console.log(packages.map((p) => p.toString()))

export function setTargetPackageForDependencies(initialPackage : Package) {
    const directDependencies = initialPackage.dependencies.map((d) => d.maxSatisfyingPackage(packages))

    const errors = directDependencies.map((rd, index) => {
        if (rd === undefined) {
            return `No package found for dependency: ${initialPackage.dependencies[index].toString()}`
        }
    }).filter((e) => e !== undefined) as string[]
    
    if (errors.length > 0) throw Error(errors.join('; '))
    
    // Select an appropriate package
    initialPackage.dependencies.forEach((d, index) => {
        if (directDependencies[index] !== undefined) {
            d.targetPackage = directDependencies[index]
        }
    })

    return initialPackage.dependencies.map((d) => {
        return d.targetPackage
    }).filter((p) => p !== undefined) as Package[]
}

export function setTargetPackageForAllDependencies(initialPackage : Package) {
    const visited: Package[] = []
    visited.push(initialPackage)

    const targetPackages = setTargetPackageForDependencies(initialPackage);

    targetPackages.filter((p) => visited.indexOf(p) === -1).forEach((p) => {
        setTargetPackageForDependencies(p)
    })
}

const initialPackage = C001
// const directDependencies = initialPackage.dependencies.map((d) => d.maxSatisfyingPackage(packages))

// const errors = directDependencies.map((rd, index) => {
//     if (rd === undefined) {
//         return `No package found for dependency: ${initialPackage.dependencies[index].toString()}`
//     }
// }).filter((e) => e!==undefined)

// console.log(errors)

// console.log(directDependencies)


// // Select an appropriate package
// initialPackage.dependencies.forEach((d, index) => {
//     if (directDependencies[index] !== undefined) {
//         d.targetPackage = directDependencies[index]
//     }
// })

setTargetPackageForAllDependencies(initialPackage)

console.log(initialPackage.toString())

export function collectAllPackages(initialPackage: Package) {
    const allPackages: Package[] = []
    allPackages.push(initialPackage)

    let index = 0

    while (index < allPackages.length) {
        const pa = allPackages[index]
        const ps = pa.dependencies.map((d) => d.targetPackage).filter((p) => p !== undefined) as Package[]

        // Add non-duplicate packages
        ps.forEach((p) => {
            if(allPackages.indexOf(p) === -1) {
                allPackages.push(p)
            }
        })

        index += 1
    }

    return allPackages
}

initialPackage.dependencies.map((d) => d.targetPackage)

const allPackages = collectAllPackages(initialPackage)
console.log(allPackages)

const packagesByName: { [packageName: string]: Package[] } = {}
allPackages.forEach((p) => {
    if (packagesByName[p.name] === undefined) {
        packagesByName[p.name] = []
    }
    packagesByName[p.name].push(p)
})

const packagesWithMultipleVersions = Object.fromEntries(Object.entries(packagesByName).filter(([name, packages]) => packages.length > 1))
console.log(packagesWithMultipleVersions)

for(let [name, packages] of Object.entries(packagesWithMultipleVersions)) {
    const satisfactions = packages.map((p1) => {
        return allPackages.map((p2) => {
            return {pack: p2, fine: p2.isFineWith(p1)}
        })
    })

    const dissatisfactions = satisfactions.map((ap) => ap.filter(({pack, fine}) => fine === false))
    console.log(dissatisfactions)

    const s = dissatisfactions.filter((arr) => arr.length === 0)

    if (s.length === 0) {
        const msgs = packages.map((p, index) => {
            if (dissatisfactions[index].length === 0) {
                return undefined
            }
            
            const dissatisfied = dissatisfactions[index].map(({pack, fine}) => `${pack.name}-${pack.version}`).join(', ')
    
            return `Package ${p.name}-${p.version} does not satisfy: ${dissatisfied}`
        }).filter((s) => s!==undefined)

        throw Error(`Cannot satisfy dependency '${name}'. ${msgs}`)
    }

    console.log(s)
}
