import { SafeRandom } from '../safe-random';

describe('SafeRandom', () => {
  describe('generateCode', () => {
    it('should generate a code with default length of 16', () => {
      const code = SafeRandom.generateCode();
      expect(code).toHaveLength(16);
    });

    it('should generate a code with specified length', () => {
      const code = SafeRandom.generateCode(6);
      expect(code).toHaveLength(6);
    });

    it('should only use characters from SAFE_ALPHABET by default', () => {
      const safeAlphabet = ['b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'm', 'n', 'p', 'q', 'r', 's', 't', 'w', 'x', 'y', 'z'];
      const code = SafeRandom.generateCode(100); // Generate long code for better coverage
      
      for (const char of code) {
        expect(safeAlphabet).toContain(char);
      }
    });

    it('should not contain vowels or l,v in generated codes', () => {
      const code = SafeRandom.generateCode(100);
      const forbiddenChars = ['a', 'e', 'i', 'o', 'u', 'l', 'v', 'A', 'E', 'I', 'O', 'U', 'L', 'V'];
      
      for (const char of code) {
        expect(forbiddenChars).not.toContain(char);
      }
    });

    it('should generate different codes on subsequent calls', () => {
      const code1 = SafeRandom.generateCode(6);
      const code2 = SafeRandom.generateCode(6);
      const code3 = SafeRandom.generateCode(6);
      
      // With cryptographic randomness, these should almost certainly be different
      expect(code1).not.toBe(code2);
      expect(code2).not.toBe(code3);
      expect(code1).not.toBe(code3);
    });

    it('should use custom charset when provided', () => {
      const customCharset = ['X', 'Y', 'Z'];
      const code = SafeRandom.generateCode(10, customCharset);
      
      expect(code).toHaveLength(10);
      for (const char of code) {
        expect(customCharset).toContain(char);
      }
    });

    it('should generate lowercase codes by default', () => {
      const code = SafeRandom.generateCode(6);
      expect(code).toBe(code.toLowerCase());
    });

    it('should generate codes that match Ruby SafeRandom format', () => {
      // Ruby: SAFE_ALPHABET = (('a'..'z').to_a - %w[a e i o u l v])
      // Results in: b,c,d,f,g,h,j,k,m,n,p,q,r,s,t,w,x,y,z (19 chars)
      const code = SafeRandom.generateCode(6);
      
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[bcdfghjkmnpqrstwxyz]{6}$/);
    });
  });
});
