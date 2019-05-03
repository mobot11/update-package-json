// return the package and version as a tuple.
const getConcurDeps = (deps) => {
    const isConcurDep = new RegExp('@concur');
    return Object.entries(deps).filter(dep => isConcurDep.test(dep[0]));
};

export { getConcurDeps };
