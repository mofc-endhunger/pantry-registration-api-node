import { randomBytes } from 'crypto';

/**
 * Generates codes of set length with limited characters
 * 
 * Matches the legacy Ruby SafeRandom implementation for compatibility
 */
export class SafeRandom {
  /**
   * Use only lowercase letters to make it easy for users entering codes on smartphones
   * Exclude letters that could result in offensive codes
   * 
   * SAFE_ALPHABET = lowercase letters minus vowels (a,e,i,o,u) and l,v
   * Results in 19 characters: b,c,d,f,g,h,j,k,m,n,p,q,r,s,t,w,x,y,z
   */
  private static readonly SAFE_ALPHABET = [
    'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'm', 'n',
    'p', 'q', 'r', 's', 't', 'w', 'x', 'y', 'z'
  ];

  /**
   * Generates a variable length code with a provided character set
   * 
   * @param len - Desired length of the code (default: 16)
   * @param charset - Array of allowed characters (default: SAFE_ALPHABET)
   * @returns The generated random code
   * 
   * @example
   * SafeRandom.generateCode()     // => "nhrpwkpyyydjdpmf"
   * SafeRandom.generateCode(6)    // => "bcdfjk"
   * SafeRandom.generateCode(4, ['X','Y','Z']) // => "YYXZ"
   */
  static generateCode(len: number = 16, charset: string[] = SafeRandom.SAFE_ALPHABET): string {
    const charsetSize = charset.length;
    const bytes = randomBytes(len);
    
    let code = '';
    for (let i = 0; i < len; i++) {
      code += charset[bytes[i] % charsetSize];
    }
    
    return code;
  }
}
