import { ConfidenceScore } from '../confidence-score.vo';

describe('ConfidenceScore Value Object', () => {
  describe('constructor', () => {
    it('should create valid confidence score', () => {
      const score = new ConfidenceScore(0.75);
      expect(score.getValue()).toBe(0.75);
    });

    it('should normalize value to 3 decimal places', () => {
      const score = new ConfidenceScore(0.12345678);
      expect(score.getValue()).toBe(0.123);
    });

    it('should accept minimum value', () => {
      const score = new ConfidenceScore(0);
      expect(score.getValue()).toBe(0);
    });

    it('should accept maximum value', () => {
      const score = new ConfidenceScore(1);
      expect(score.getValue()).toBe(1);
    });

    it('should throw error for invalid number', () => {
      expect(() => new ConfidenceScore(NaN)).toThrow('Confidence score must be a valid number');
      expect(() => new ConfidenceScore(null as any)).toThrow('Confidence score must be a valid number');
      expect(() => new ConfidenceScore(undefined as any)).toThrow('Confidence score must be a valid number');
    });

    it('should throw error for values below minimum', () => {
      expect(() => new ConfidenceScore(-0.1)).toThrow('Confidence score must be between 0 and 1');
      expect(() => new ConfidenceScore(-1)).toThrow('Confidence score must be between 0 and 1');
    });

    it('should throw error for values above maximum', () => {
      expect(() => new ConfidenceScore(1.1)).toThrow('Confidence score must be between 0 and 1');
      expect(() => new ConfidenceScore(2)).toThrow('Confidence score must be between 0 and 1');
    });
  });

  describe('percentage conversion', () => {
    it('should convert to percentage', () => {
      const score = new ConfidenceScore(0.75);
      expect(score.toPercentage()).toBe(75);
    });

    it('should convert to percentage string', () => {
      const score = new ConfidenceScore(0.85);
      expect(score.toPercentageString()).toBe('85%');
    });

    it('should round percentage correctly', () => {
      const score = new ConfidenceScore(0.756);
      expect(score.toPercentage()).toBe(76);
    });
  });

  describe('confidence levels', () => {
    it('should classify very high confidence', () => {
      const score = new ConfidenceScore(0.95);
      expect(score.getLevel()).toBe('very_high');
    });

    it('should classify high confidence', () => {
      const score = new ConfidenceScore(0.8);
      expect(score.getLevel()).toBe('high');
    });

    it('should classify medium confidence', () => {
      const score = new ConfidenceScore(0.6);
      expect(score.getLevel()).toBe('medium');
    });

    it('should classify low confidence', () => {
      const score = new ConfidenceScore(0.3);
      expect(score.getLevel()).toBe('low');
    });

    it('should classify very low confidence', () => {
      const score = new ConfidenceScore(0.1);
      expect(score.getLevel()).toBe('very_low');
    });

    it('should handle edge cases for levels', () => {
      expect(new ConfidenceScore(0.9).getLevel()).toBe('very_high');
      expect(new ConfidenceScore(0.75).getLevel()).toBe('high');
      expect(new ConfidenceScore(0.5).getLevel()).toBe('medium');
      expect(new ConfidenceScore(0.25).getLevel()).toBe('low');
      expect(new ConfidenceScore(0.24).getLevel()).toBe('very_low');
    });
  });

  describe('threshold comparisons', () => {
    const score = new ConfidenceScore(0.7);

    it('should check if above threshold', () => {
      expect(score.isAbove(0.6)).toBe(true);
      expect(score.isAbove(0.7)).toBe(false);
      expect(score.isAbove(0.8)).toBe(false);
    });

    it('should check if below threshold', () => {
      expect(score.isBelow(0.8)).toBe(true);
      expect(score.isBelow(0.7)).toBe(false);
      expect(score.isBelow(0.6)).toBe(false);
    });
  });

  describe('arithmetic operations', () => {
    it('should add confidence scores', () => {
      const score1 = new ConfidenceScore(0.3);
      const score2 = new ConfidenceScore(0.4);
      const result = score1.add(score2);

      expect(result.getValue()).toBe(0.7);
    });

    it('should cap addition at maximum value', () => {
      const score1 = new ConfidenceScore(0.7);
      const score2 = new ConfidenceScore(0.5);
      const result = score1.add(score2);

      expect(result.getValue()).toBe(1);
    });

    it('should multiply confidence scores', () => {
      const score1 = new ConfidenceScore(0.8);
      const score2 = new ConfidenceScore(0.5);
      const result = score1.multiply(score2);

      expect(result.getValue()).toBe(0.4);
    });
  });

  describe('static methods', () => {
    describe('average', () => {
      it('should calculate average of scores', () => {
        const scores = [
          new ConfidenceScore(0.6),
          new ConfidenceScore(0.8),
          new ConfidenceScore(0.7),
        ];
        const average = ConfidenceScore.average(scores);

        expect(average.getValue()).toBeCloseTo(0.7, 3);
      });

      it('should handle single score', () => {
        const scores = [new ConfidenceScore(0.5)];
        const average = ConfidenceScore.average(scores);

        expect(average.getValue()).toBe(0.5);
      });

      it('should throw error for empty array', () => {
        expect(() => ConfidenceScore.average([])).toThrow('Cannot calculate average of empty scores');
      });
    });

    describe('weightedAverage', () => {
      it('should calculate weighted average', () => {
        const scores = [
          { score: new ConfidenceScore(0.8), weight: 2 },
          { score: new ConfidenceScore(0.6), weight: 1 },
        ];
        const average = ConfidenceScore.weightedAverage(scores);

        expect(average.getValue()).toBeCloseTo(0.733, 3);
      });

      it('should handle equal weights', () => {
        const scores = [
          { score: new ConfidenceScore(0.6), weight: 1 },
          { score: new ConfidenceScore(0.8), weight: 1 },
        ];
        const average = ConfidenceScore.weightedAverage(scores);

        expect(average.getValue()).toBe(0.7);
      });

      it('should throw error for empty array', () => {
        expect(() => ConfidenceScore.weightedAverage([])).toThrow('Cannot calculate weighted average of empty scores');
      });

      it('should throw error for zero total weight', () => {
        const scores = [
          { score: new ConfidenceScore(0.5), weight: 0 },
          { score: new ConfidenceScore(0.7), weight: 0 },
        ];
        expect(() => ConfidenceScore.weightedAverage(scores)).toThrow('Total weight cannot be zero');
      });
    });

    describe('factory methods', () => {
      it('should create from number', () => {
        const score = ConfidenceScore.from(0.75);
        expect(score.getValue()).toBe(0.75);
      });

      it('should create from percentage', () => {
        const score = ConfidenceScore.fromPercentage(85);
        expect(score.getValue()).toBe(0.85);
      });

      it('should handle edge percentage values', () => {
        expect(ConfidenceScore.fromPercentage(0).getValue()).toBe(0);
        expect(ConfidenceScore.fromPercentage(100).getValue()).toBe(1);
      });
    });
  });

  describe('equality and string conversion', () => {
    it('should check equality', () => {
      const score1 = new ConfidenceScore(0.75);
      const score2 = new ConfidenceScore(0.75);
      const score3 = new ConfidenceScore(0.76);

      expect(score1.equals(score2)).toBe(true);
      expect(score1.equals(score3)).toBe(false);
    });

    it('should handle floating point precision in equality', () => {
      const score1 = new ConfidenceScore(0.1 + 0.2); // 0.30000000000000004
      const score2 = new ConfidenceScore(0.3);

      expect(score1.equals(score2)).toBe(true);
    });

    it('should handle null in equality check', () => {
      const score = new ConfidenceScore(0.5);
      expect(score.equals(null as any)).toBe(false);
    });

    it('should convert to string', () => {
      const score = new ConfidenceScore(0.756);
      expect(score.toString()).toBe('0.756');
    });
  });
});