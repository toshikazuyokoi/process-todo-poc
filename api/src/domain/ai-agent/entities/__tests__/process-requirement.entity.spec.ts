import { ProcessRequirement } from '../process-requirement.entity';
import { RequirementCategory, RequirementPriority } from '../../enums/requirement-category.enum';
import { ConfidenceScore } from '../../value-objects/confidence-score.vo';

describe('ProcessRequirement Entity', () => {
  const validParams = {
    id: 'req-123',
    category: RequirementCategory.GOAL,
    description: 'Launch a new product within 6 months',
    priority: RequirementPriority.HIGH,
    confidence: 0.85,
    extractedFrom: 'msg-456',
    entities: {
      budget: 100000,
      team_size: 5,
      constraints: ['Budget: $100,000', 'Team: 5 people'],
      dependencies: ['Market research', 'Product design']
    }
  };

  describe('constructor', () => {
    it('should create a valid process requirement', () => {
      const requirement = new ProcessRequirement(validParams);

      expect(requirement.getId()).toBe('req-123');
      expect(requirement.getCategory()).toBe(RequirementCategory.GOAL);
      expect(requirement.getDescription()).toBe('Launch a new product within 6 months');
      expect(requirement.getPriority()).toBe(RequirementPriority.HIGH);
      expect(requirement.getConfidence()).toBeInstanceOf(ConfidenceScore);
      expect(requirement.getConfidence().getValue()).toBe(0.85);
      expect(requirement.getExtractedFrom()).toBe('msg-456');
      expect(requirement.getEntities()).toEqual(validParams.entities);
      expect(requirement.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('should use default values for optional parameters', () => {
      const requirement = new ProcessRequirement({
        id: 'req-456',
        category: RequirementCategory.CONSTRAINT,
        description: 'Must comply with regulations',
        priority: RequirementPriority.MEDIUM,
        confidence: 0.5,
        extractedFrom: 'msg-789'
      });

      expect(requirement.getPriority()).toBe(RequirementPriority.MEDIUM);
      expect(requirement.getConfidence().getValue()).toBe(0.5);
      expect(requirement.getExtractedFrom()).toBe('msg-789');
      expect(requirement.getEntities()).toBeUndefined();
      expect(requirement.getCreatedAt()).toBeInstanceOf(Date);
    });

    it('should accept ConfidenceScore instance', () => {
      const confidenceScore = new ConfidenceScore(0.95);
      const requirement = new ProcessRequirement({
        ...validParams,
        confidence: confidenceScore
      });

      expect(requirement.getConfidence()).toBe(confidenceScore);
    });

    it('should use provided createdAt date', () => {
      const customDate = new Date('2024-01-01T10:00:00Z');
      const requirement = new ProcessRequirement({
        ...validParams,
        createdAt: customDate
      });

      expect(requirement.getCreatedAt()).toEqual(customDate);
    });

    it('should throw error when id is empty', () => {
      expect(() => new ProcessRequirement({
        ...validParams,
        id: ''
      })).toThrow('Requirement ID is required');
    });

    it('should throw error when description is empty', () => {
      expect(() => new ProcessRequirement({
        ...validParams,
        description: '   '
      })).toThrow('Requirement description is required');
    });

    it('should throw error when category is missing', () => {
      expect(() => new ProcessRequirement({
        ...validParams,
        category: undefined as any
      })).toThrow('Requirement category is required');
    });

    it('should throw error when priority is missing', () => {
      expect(() => new ProcessRequirement({
        ...validParams,
        priority: undefined as any
      })).toThrow('Requirement priority is required');
    });

    it('should throw error when extractedFrom is missing', () => {
      expect(() => new ProcessRequirement({
        ...validParams,
        extractedFrom: ''
      })).toThrow('Source message ID is required');
    });
  });

  describe('category validation', () => {
    const categories = [
      RequirementCategory.GOAL,
      RequirementCategory.CONSTRAINT,
      RequirementCategory.STAKEHOLDER,
      RequirementCategory.DELIVERABLE,
      RequirementCategory.TIMELINE,
      RequirementCategory.QUALITY,
      RequirementCategory.COMPLIANCE,
      RequirementCategory.RISK
    ];

    categories.forEach(category => {
      it(`should accept ${category} category`, () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          category
        });
        expect(requirement.getCategory()).toBe(category);
      });
    });
  });

  describe('priority validation', () => {
    const priorities = [
      RequirementPriority.CRITICAL,
      RequirementPriority.HIGH,
      RequirementPriority.MEDIUM,
      RequirementPriority.LOW
    ];

    priorities.forEach(priority => {
      it(`should accept ${priority} priority`, () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority
        });
        expect(requirement.getPriority()).toBe(priority);
      });
    });
  });

  describe('utility methods', () => {
    describe('isCritical', () => {
      it('should return true for CRITICAL priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.CRITICAL
        });
        expect(requirement.isCritical()).toBe(true);
      });

      it('should return false for other priorities', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.HIGH
        });
        expect(requirement.isCritical()).toBe(false);
      });
    });

    describe('isHighPriority', () => {
      it('should return true for CRITICAL priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.CRITICAL
        });
        expect(requirement.isHighPriority()).toBe(true);
      });

      it('should return true for HIGH priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.HIGH
        });
        expect(requirement.isHighPriority()).toBe(true);
      });

      it('should return false for MEDIUM priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.MEDIUM
        });
        expect(requirement.isHighPriority()).toBe(false);
      });

      it('should return false for LOW priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.LOW
        });
        expect(requirement.isHighPriority()).toBe(false);
      });
    });

    describe('isComplianceRelated', () => {
      it('should return true for COMPLIANCE category', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          category: RequirementCategory.COMPLIANCE
        });
        expect(requirement.isComplianceRelated()).toBe(true);
      });

      it('should return false for other categories', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          category: RequirementCategory.GOAL
        });
        expect(requirement.isComplianceRelated()).toBe(false);
      });
    });

    describe('isTimelineRelated', () => {
      it('should return true for TIMELINE category', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          category: RequirementCategory.TIMELINE
        });
        expect(requirement.isTimelineRelated()).toBe(true);
      });

      it('should return false for other categories', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          category: RequirementCategory.GOAL
        });
        expect(requirement.isTimelineRelated()).toBe(false);
      });
    });

    describe('hasHighConfidence', () => {
      it('should return true when confidence is above threshold', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          confidence: 0.8
        });
        expect(requirement.hasHighConfidence(0.7)).toBe(true);
      });

      it('should return false when confidence is below threshold', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          confidence: 0.6
        });
        expect(requirement.hasHighConfidence(0.7)).toBe(false);
      });

      it('should use default threshold of 0.7', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          confidence: 0.75
        });
        expect(requirement.hasHighConfidence()).toBe(true);
      });
    });

    describe('getPriorityWeight', () => {
      it('should return 4 for CRITICAL priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.CRITICAL
        });
        expect(requirement.getPriorityWeight()).toBe(4);
      });

      it('should return 3 for HIGH priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.HIGH
        });
        expect(requirement.getPriorityWeight()).toBe(3);
      });

      it('should return 2 for MEDIUM priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.MEDIUM
        });
        expect(requirement.getPriorityWeight()).toBe(2);
      });

      it('should return 1 for LOW priority', () => {
        const requirement = new ProcessRequirement({
          ...validParams,
          priority: RequirementPriority.LOW
        });
        expect(requirement.getPriorityWeight()).toBe(1);
      });
    });
  });

  describe('entities handling', () => {
    it('should store complex entities', () => {
      const complexEntities = {
        budget: 150000,
        team_size: 10,
        departments: ['Engineering', 'Marketing', 'Sales'],
        constraints: ['Time limit: 3 months', 'Budget cap: $150k'],
        dependencies: ['API integration', 'Legal approval'],
        custom_fields: {
          region: 'North America',
          compliance: ['GDPR', 'CCPA']
        }
      };

      const requirement = new ProcessRequirement({
        ...validParams,
        entities: complexEntities
      });

      expect(requirement.getEntities()).toEqual(complexEntities);
    });

    it('should handle undefined entities', () => {
      const requirement = new ProcessRequirement({
        id: 'req-999',
        category: RequirementCategory.GOAL,
        description: 'Simple requirement',
        priority: RequirementPriority.LOW,
        confidence: 0.5,
        extractedFrom: 'msg-111'
      });

      expect(requirement.getEntities()).toBeUndefined();
    });
  });

  describe('serialization', () => {
    describe('toJSON', () => {
      it('should serialize to plain object', () => {
        const createdAt = new Date('2024-01-01T10:00:00Z');
        const requirement = new ProcessRequirement({
          ...validParams,
          createdAt
        });

        const json = requirement.toJSON();

        expect(json).toEqual({
          id: 'req-123',
          category: RequirementCategory.GOAL,
          description: 'Launch a new product within 6 months',
          priority: RequirementPriority.HIGH,
          confidence: 0.85,
          extractedFrom: 'msg-456',
          entities: validParams.entities,
          createdAt: '2024-01-01T10:00:00.000Z'
        });
      });

      it('should handle undefined optional fields', () => {
        const requirement = new ProcessRequirement({
          id: 'req-789',
          category: RequirementCategory.TIMELINE,
          description: 'Complete by Q3',
          priority: RequirementPriority.MEDIUM,
          confidence: 0.7,
          extractedFrom: 'msg-222'
        });

        const json = requirement.toJSON();

        expect(json.entities).toBeUndefined();
      });
    });

    describe('fromJSON', () => {
      it('should deserialize from plain object', () => {
        const json = {
          id: 'req-456',
          category: RequirementCategory.COMPLIANCE,
          description: 'Must meet ISO standards',
          priority: RequirementPriority.CRITICAL,
          confidence: 0.95,
          extractedFrom: 'msg-333',
          entities: {
            standards: ['ISO 9001', 'ISO 27001'],
            audit_required: true
          },
          createdAt: '2024-01-01T10:00:00.000Z'
        };

        const requirement = ProcessRequirement.fromJSON(json);

        expect(requirement.getId()).toBe('req-456');
        expect(requirement.getCategory()).toBe(RequirementCategory.COMPLIANCE);
        expect(requirement.getDescription()).toBe('Must meet ISO standards');
        expect(requirement.getPriority()).toBe(RequirementPriority.CRITICAL);
        expect(requirement.getConfidence().getValue()).toBe(0.95);
        expect(requirement.getExtractedFrom()).toBe('msg-333');
        expect(requirement.getEntities()).toEqual(json.entities);
        expect(requirement.getCreatedAt()).toEqual(new Date('2024-01-01T10:00:00.000Z'));
      });

      it('should handle missing optional fields', () => {
        const json = {
          id: 'req-999',
          category: RequirementCategory.RISK,
          description: 'Potential delay risk',
          priority: RequirementPriority.HIGH,
          confidence: 0.6,
          extractedFrom: 'msg-444'
        };

        const requirement = ProcessRequirement.fromJSON(json);

        expect(requirement.getId()).toBe('req-999');
        expect(requirement.getPriority()).toBe(RequirementPriority.HIGH);
        expect(requirement.getConfidence().getValue()).toBe(0.6);
        expect(requirement.getEntities()).toBeUndefined();
      });

      it('should roundtrip correctly', () => {
        const original = new ProcessRequirement(validParams);
        const json = original.toJSON();
        const restored = ProcessRequirement.fromJSON(json);
        const restoredJson = restored.toJSON();

        expect(restoredJson).toEqual(json);
      });
    });
  });

  describe('static methods', () => {
    describe('sortByImportance', () => {
      it('should sort requirements by priority and confidence', () => {
        const requirements = [
          new ProcessRequirement({
            ...validParams,
            id: 'req-1',
            priority: RequirementPriority.LOW,
            confidence: 0.9
          }),
          new ProcessRequirement({
            ...validParams,
            id: 'req-2',
            priority: RequirementPriority.CRITICAL,
            confidence: 0.5
          }),
          new ProcessRequirement({
            ...validParams,
            id: 'req-3',
            priority: RequirementPriority.HIGH,
            confidence: 0.8
          }),
          new ProcessRequirement({
            ...validParams,
            id: 'req-4',
            priority: RequirementPriority.HIGH,
            confidence: 0.9
          })
        ];

        const sorted = ProcessRequirement.sortByImportance(requirements);

        expect(sorted[0].getId()).toBe('req-2'); // CRITICAL
        expect(sorted[1].getId()).toBe('req-4'); // HIGH with 0.9
        expect(sorted[2].getId()).toBe('req-3'); // HIGH with 0.8
        expect(sorted[3].getId()).toBe('req-1'); // LOW
      });
    });

    describe('groupByCategory', () => {
      it('should group requirements by category', () => {
        const requirements = [
          new ProcessRequirement({
            ...validParams,
            id: 'req-1',
            category: RequirementCategory.GOAL
          }),
          new ProcessRequirement({
            ...validParams,
            id: 'req-2',
            category: RequirementCategory.CONSTRAINT
          }),
          new ProcessRequirement({
            ...validParams,
            id: 'req-3',
            category: RequirementCategory.GOAL
          })
        ];

        const grouped = ProcessRequirement.groupByCategory(requirements);

        expect(grouped.get(RequirementCategory.GOAL)?.length).toBe(2);
        expect(grouped.get(RequirementCategory.CONSTRAINT)?.length).toBe(1);
        expect(grouped.get(RequirementCategory.GOAL)?.[0].getId()).toBe('req-1');
        expect(grouped.get(RequirementCategory.GOAL)?.[1].getId()).toBe('req-3');
      });
    });
  });
});