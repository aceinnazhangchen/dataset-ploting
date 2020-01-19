
const keysort = function(key,sortType){
    return function(a,b){
        return sortType ?(a[key]-b[key]):(b[key]-a[key]);
    }
}
module.exports = {
    keysort
}