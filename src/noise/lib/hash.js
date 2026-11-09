export function positiveMod(n, m) {
  return ((n % m) + m) % m
}

/** Integer hash → uint32 */
export function hashInt(n) {
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  n = Math.imul(n ^ (n >>> 16), 0x45d9f3b)
  return (n ^ (n >>> 16)) >>> 0
}

export function hash2(ix, iy, seed) {
  return hashInt(ix + hashInt(iy + hashInt(seed + 17))) / 4294967296
}

export function hash3(ix, iy, iz, seed) {
  return hashInt(ix + hashInt(iy + hashInt(iz + hashInt(seed + 31)))) / 4294967296
}
