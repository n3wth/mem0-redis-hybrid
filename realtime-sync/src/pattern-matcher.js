import { createLogger } from './logger.js';
import { CONFIG } from '../config/config.js';

const logger = createLogger('PatternMatcher');

/**
 * Advanced pattern matching system for subscription filtering
 * Supports wildcards, regex, path-based patterns, and caching
 */
export class PatternMatcher {
  constructor(config = CONFIG.patterns) {
    this.config = config;
    this.cache = new Map();
    this.compiledPatterns = new Map();
    this.stats = {
      cacheHits: 0,
      cacheMisses: 0,
      patternCompilations: 0,
      matchChecks: 0
    };

    // Start cache cleanup
    this.startCacheCleanup();
  }

  /**
   * Check if a channel matches any of the given patterns
   */
  matches(channel, patterns) {
    if (!patterns || patterns.length === 0) return false;

    this.stats.matchChecks++;

    for (const pattern of patterns) {
      if (this.matchSingle(channel, pattern)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if a channel matches a single pattern
   */
  matchSingle(channel, pattern) {
    // Check cache first
    const cacheKey = `${channel}:${pattern}`;
    if (this.cache.has(cacheKey)) {
      this.stats.cacheHits++;
      return this.cache.get(cacheKey);
    }

    this.stats.cacheMisses++;

    let result;

    // Determine pattern type and match accordingly
    if (this.isRegexPattern(pattern)) {
      result = this.matchRegex(channel, pattern);
    } else if (this.isWildcardPattern(pattern)) {
      result = this.matchWildcard(channel, pattern);
    } else if (this.isPathPattern(pattern)) {
      result = this.matchPath(channel, pattern);
    } else {
      // Exact match
      result = channel === pattern;
    }

    // Cache result if cache isn't full
    if (this.cache.size < this.config.cacheSize) {
      this.cache.set(cacheKey, result);
    }

    return result;
  }

  /**
   * Match against regex pattern
   */
  matchRegex(channel, pattern) {
    try {
      let regex = this.compiledPatterns.get(pattern);

      if (!regex) {
        // Extract regex from pattern (format: /regex/flags)
        const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
          regex = new RegExp(match[1], match[2]);
        } else {
          // Treat as plain regex without delimiters
          regex = new RegExp(pattern);
        }

        this.compiledPatterns.set(pattern, regex);
        this.stats.patternCompilations++;
      }

      return regex.test(channel);
    } catch (error) {
      logger.warn('Invalid regex pattern:', { pattern, error: error.message });
      return false;
    }
  }

  /**
   * Match against wildcard pattern (* and ?)
   */
  matchWildcard(channel, pattern) {
    let regex = this.compiledPatterns.get(pattern);

    if (!regex) {
      // Convert wildcard pattern to regex
      const regexPattern = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
        .replace(/\\\*/g, '.*')              // * becomes .*
        .replace(/\\\?/g, '.');              // ? becomes .

      regex = new RegExp(`^${regexPattern}$`);
      this.compiledPatterns.set(pattern, regex);
      this.stats.patternCompilations++;
    }

    return regex.test(channel);
  }

  /**
   * Match against path-based pattern (hierarchical matching)
   */
  matchPath(channel, pattern) {
    const channelParts = channel.split('.');
    const patternParts = pattern.split('.');

    return this.matchPathParts(channelParts, patternParts, 0, 0);
  }

  /**
   * Recursively match path parts with support for ** wildcard
   */
  matchPathParts(channelParts, patternParts, channelIdx, patternIdx) {
    // If we've consumed both arrays, it's a match
    if (channelIdx >= channelParts.length && patternIdx >= patternParts.length) {
      return true;
    }

    // If pattern is exhausted but channel isn't, no match (unless last pattern was **)
    if (patternIdx >= patternParts.length) {
      return false;
    }

    // If channel is exhausted but pattern isn't, check if remaining patterns can match empty
    if (channelIdx >= channelParts.length) {
      return this.canMatchEmpty(patternParts, patternIdx);
    }

    const patternPart = patternParts[patternIdx];
    const channelPart = channelParts[channelIdx];

    if (patternPart === '**') {
      // ** matches zero or more path segments
      // Try matching zero segments (skip **)
      if (this.matchPathParts(channelParts, patternParts, channelIdx, patternIdx + 1)) {
        return true;
      }
      // Try matching one or more segments
      for (let i = channelIdx; i < channelParts.length; i++) {
        if (this.matchPathParts(channelParts, patternParts, i + 1, patternIdx + 1)) {
          return true;
        }
      }
      return false;
    } else if (patternPart === '*' || this.matchWildcard(channelPart, patternPart)) {
      // * matches exactly one segment, or pattern matches current segment
      return this.matchPathParts(channelParts, patternParts, channelIdx + 1, patternIdx + 1);
    } else {
      // No match
      return false;
    }
  }

  /**
   * Check if remaining pattern parts can match empty
   */
  canMatchEmpty(patternParts, startIdx) {
    for (let i = startIdx; i < patternParts.length; i++) {
      if (patternParts[i] !== '**') {
        return false;
      }
    }
    return true;
  }

  /**
   * Check if pattern is a regex pattern
   */
  isRegexPattern(pattern) {
    return pattern.startsWith('/') && pattern.includes('/') && pattern.lastIndexOf('/') > 0;
  }

  /**
   * Check if pattern contains wildcards
   */
  isWildcardPattern(pattern) {
    return pattern.includes('*') || pattern.includes('?');
  }

  /**
   * Check if pattern is path-based (contains dots)
   */
  isPathPattern(pattern) {
    return pattern.includes('.');
  }

  /**
   * Get all channels that match a pattern from a list
   */
  filter(channels, patterns) {
    return channels.filter(channel => this.matches(channel, patterns));
  }

  /**
   * Group patterns by type for optimization
   */
  groupPatterns(patterns) {
    const groups = {
      exact: [],
      wildcard: [],
      regex: [],
      path: []
    };

    for (const pattern of patterns) {
      if (this.isRegexPattern(pattern)) {
        groups.regex.push(pattern);
      } else if (this.isWildcardPattern(pattern)) {
        groups.wildcard.push(pattern);
      } else if (this.isPathPattern(pattern)) {
        groups.path.push(pattern);
      } else {
        groups.exact.push(pattern);
      }
    }

    return groups;
  }

  /**
   * Optimized matching for grouped patterns
   */
  matchesGrouped(channel, groupedPatterns) {
    // Check exact matches first (fastest)
    if (groupedPatterns.exact.includes(channel)) {
      return true;
    }

    // Check wildcard patterns
    if (groupedPatterns.wildcard.length > 0) {
      for (const pattern of groupedPatterns.wildcard) {
        if (this.matchWildcard(channel, pattern)) {
          return true;
        }
      }
    }

    // Check path patterns
    if (groupedPatterns.path.length > 0) {
      for (const pattern of groupedPatterns.path) {
        if (this.matchPath(channel, pattern)) {
          return true;
        }
      }
    }

    // Check regex patterns (slowest)
    if (groupedPatterns.regex.length > 0) {
      for (const pattern of groupedPatterns.regex) {
        if (this.matchRegex(channel, pattern)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Validate pattern syntax
   */
  validatePattern(pattern) {
    const errors = [];

    if (typeof pattern !== 'string' || pattern.length === 0) {
      errors.push('Pattern must be a non-empty string');
      return { valid: false, errors };
    }

    // Check regex pattern
    if (this.isRegexPattern(pattern)) {
      try {
        const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
          new RegExp(match[1], match[2]);
        } else {
          new RegExp(pattern);
        }
      } catch (error) {
        errors.push(`Invalid regex pattern: ${error.message}`);
      }
    }

    // Check pattern length
    if (pattern.length > 256) {
      errors.push('Pattern too long (max 256 characters)');
    }

    // Check for potentially dangerous patterns
    if (pattern.includes('(.{0,1000000})') || pattern.includes('(.*){')) {
      errors.push('Pattern may cause performance issues');
    }

    return {
      valid: errors.length === 0,
      errors,
      type: this.getPatternType(pattern)
    };
  }

  /**
   * Get pattern type for validation
   */
  getPatternType(pattern) {
    if (this.isRegexPattern(pattern)) return 'regex';
    if (this.isWildcardPattern(pattern)) return 'wildcard';
    if (this.isPathPattern(pattern)) return 'path';
    return 'exact';
  }

  /**
   * Create optimized matcher for a set of patterns
   */
  createMatcher(patterns) {
    const validPatterns = patterns.filter(p => this.validatePattern(p).valid);
    const groupedPatterns = this.groupPatterns(validPatterns);

    // Pre-compile all patterns
    validPatterns.forEach(pattern => {
      if (this.isWildcardPattern(pattern) || this.isRegexPattern(pattern)) {
        this.compiledPatterns.get(pattern) || this.matchSingle('dummy', pattern);
      }
    });

    return {
      matches: (channel) => this.matchesGrouped(channel, groupedPatterns),
      patterns: validPatterns,
      stats: () => ({
        exactCount: groupedPatterns.exact.length,
        wildcardCount: groupedPatterns.wildcard.length,
        pathCount: groupedPatterns.path.length,
        regexCount: groupedPatterns.regex.length,
        totalCount: validPatterns.length
      })
    };
  }

  /**
   * Start cache cleanup process
   */
  startCacheCleanup() {
    if (!this.config.cacheTtl) return;

    setInterval(() => {
      // Simple LRU cleanup - remove half the cache when it's full
      if (this.cache.size >= this.config.cacheSize) {
        const entriesToKeep = Math.floor(this.config.cacheSize / 2);
        const entries = Array.from(this.cache.entries());

        this.cache.clear();

        // Keep the most recently used entries
        entries.slice(-entriesToKeep).forEach(([key, value]) => {
          this.cache.set(key, value);
        });

        logger.debug('Pattern matcher cache cleaned', {
          entriesRemoved: entries.length - entriesToKeep,
          entriesKept: entriesToKeep
        });
      }
    }, this.config.cacheTtl * 1000);
  }

  /**
   * Get matcher statistics
   */
  getStats() {
    return {
      ...this.stats,
      cacheSize: this.cache.size,
      maxCacheSize: this.config.cacheSize,
      compiledPatterns: this.compiledPatterns.size,
      cacheHitRatio: this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses) || 0
    };
  }

  /**
   * Clear all caches
   */
  clearCache() {
    const cacheSize = this.cache.size;
    const compiledSize = this.compiledPatterns.size;

    this.cache.clear();
    this.compiledPatterns.clear();

    logger.info('Pattern matcher cache cleared', {
      cacheEntriesCleared: cacheSize,
      compiledPatternsCleared: compiledSize
    });
  }

  /**
   * Shutdown cleanup
   */
  shutdown() {
    this.clearCache();
    logger.info('Pattern matcher shut down');
  }
}