import type { RecordedAction } from '../App';

interface FinalState {
  completedTasks: string[];
  formValues: Record<string, string>;
  timestamp: number;
}

/**
 * Gibberish Detection and Filtering
 * Removes meaningless character sequences while preserving real content
 */
function isGibberish(text: string): boolean {
  // Random character sequences with no vowels
  if (text.length > 8 && !/[aeiou]/i.test(text)) return true;
  
  // Keyboard mashing patterns (same character repeated)
  if (/(.)\1{3,}/.test(text)) return true;
  
  // Excessive consonant clusters (5+ consonants in a row, stricter)
  if (/[bcdfghjklmnpqrstvwxyz]{5,}/gi.test(text)) return true;
  
  // Very long random strings (15+ characters without proper structure)
  if (text.length > 15 && !/^[A-Z][a-z]+$/.test(text)) {
    const vowelCount = (text.match(/[aeiou]/gi) || []).length;
    const vowelRatio = vowelCount / text.length;
    if (vowelRatio < 0.15) return true;
  }
  
  return false;
}

function isMeaningful(text: string): boolean {
  // Single characters are not meaningful
  if (text.length < 2) return false;
  
  // Strip common punctuation for analysis
  const cleaned = text.replace(/[.,!?;:'"]/g, '');
  if (cleaned.length < 2) return false;
  
  // Capitalized names (proper nouns)
  if (/^[A-Z][a-z]+$/.test(cleaned)) return true;
  
  // All lowercase words with proper structure
  if (/^[a-z]+$/i.test(cleaned)) {
    const vowelCount = (cleaned.match(/[aeiou]/gi) || []).length;
    const vowelRatio = vowelCount / cleaned.length;
    // Reasonable vowel ratio (between 15% and 75%)
    if (vowelRatio >= 0.15 && vowelRatio <= 0.75 && cleaned.length <= 20) return true;
  }
  
  // Numbers
  if (/^\d+$/.test(cleaned)) return true;
  
  // Common punctuation with letters (contractions, possessives, etc.)
  if (/^[a-z]+[''][a-z]*$/i.test(text)) return true;
  
  return false;
}

function analyzeContext(segments: string[]): string[] {
  // Build context by looking at surrounding words
  const meaningful: string[] = [];
  
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    const cleaned = segment.replace(/[.,!?;:'"]/g, '');
    
    // Check if definitely gibberish
    if (isGibberish(cleaned)) continue;
    
    // Check if clearly meaningful
    if (isMeaningful(segment)) {
      meaningful.push(segment);
      continue;
    }
    
    // Contextual analysis: if surrounded by meaningful words, it's likely meaningful
    const prevMeaningful = i > 0 && isMeaningful(segments[i - 1]);
    const nextMeaningful = i < segments.length - 1 && isMeaningful(segments[i + 1]);
    
    if (prevMeaningful && nextMeaningful) {
      // Word is sandwiched between meaningful content
      meaningful.push(segment);
    } else if (cleaned.length >= 3 && cleaned.length <= 15) {
      // Medium-length words in context might be meaningful
      const vowelCount = (cleaned.match(/[aeiou]/gi) || []).length;
      if (vowelCount >= 2) {
        meaningful.push(segment);
      }
    }
  }
  
  return meaningful;
}

function fixGrammar(text: string): string {
  if (!text || text.trim().length === 0) return text;
  
  // Fix common grammar patterns
  let fixed = text;
  
  // Fix spelling errors first
  fixed = correctSpelling(fixed);
  
  // Fix incomplete sentences ending with "to join our" - add common completions
  if (/\bjoin our\.?$/i.test(fixed)) {
    fixed = fixed.replace(/\bjoin our\.?$/i, 'join our organization.');
  }
  
  // Fix missing commas after names in greetings
  if (/^(Hey|Hi|Hello|Dear)\s+([A-Z][a-z]+)\s+(?!,)/i.test(fixed)) {
    fixed = fixed.replace(/^(Hey|Hi|Hello|Dear)\s+([A-Z][a-z]+)\s+/i, '$1 $2, ');
  }
  
  // Ensure proper sentence ending
  if (!/[.!?]$/.test(fixed.trim())) {
    fixed = fixed.trim() + '.';
  }
  
  // Clean up extra spaces
  fixed = fixed.replace(/\s+/g, ' ').trim();
  
  return fixed;
}

function correctSpelling(text: string): string {
  let corrected = text;
  
  // Common misspelling patterns
  const corrections: [RegExp, string][] = [
    // Double consonants that should be single
    [/organizzation/gi, 'organization'],
    [/organizzzation/gi, 'organization'],
    [/occassion/gi, 'occasion'],
    [/accomodate/gi, 'accommodate'],
    [/recieve/gi, 'receive'],
    [/beleive/gi, 'believe'],
    [/seperate/gi, 'separate'],
    [/definately/gi, 'definitely'],
    [/goverment/gi, 'government'],
    [/enviroment/gi, 'environment'],
    [/tommorrow/gi, 'tomorrow'],
    [/untill/gi, 'until'],
    [/successfull/gi, 'successful'],
    [/carefull/gi, 'careful'],
    [/beautifull/gi, 'beautiful'],
    [/helpfull/gi, 'helpful'],
    [/gratefull/gi, 'grateful'],
    [/thier/gi, 'their'],
    [/freind/gi, 'friend'],
    [/wierd/gi, 'weird'],
    [/occured/gi, 'occurred'],
    [/begining/gi, 'beginning'],
    [/comming/gi, 'coming'],
    [/happend/gi, 'happened'],
    [/writting/gi, 'writing'],
    [/reccomend/gi, 'recommend'],
    [/neccessary/gi, 'necessary'],
    [/embarass/gi, 'embarrass'],
    [/harrass/gi, 'harass'],
    [/arguement/gi, 'argument'],
    [/judgement/gi, 'judgment'],
    [/acknowledgement/gi, 'acknowledgment'],
    [/publically/gi, 'publicly'],
    [/basicly/gi, 'basically'],
    [/finaly/gi, 'finally'],
    [/realy/gi, 'really'],
    [/usualy/gi, 'usually'],
  ];
  
  // Apply all corrections
  for (const [pattern, replacement] of corrections) {
    corrected = corrected.replace(pattern, replacement);
  }
  
  // Fix excessive repeated letters (typos like "heyyy" -> "hey")
  corrected = corrected.replace(/(.)\1{2,}/g, (match, char) => {
    // Keep double letters for words that normally have them
    const normalDoubles = ['ee', 'oo', 'll', 'ss', 'tt', 'ff', 'pp', 'mm', 'nn', 'rr', 'cc', 'dd'];
    const doubleChar = char + char;
    if (normalDoubles.includes(doubleChar.toLowerCase())) {
      return doubleChar;
    }
    return char;
  });
  
  return corrected;
}

function detectFieldType(fieldName: string): 'name' | 'email' | 'message' | 'general' {
  const lower = fieldName.toLowerCase();
  
  // Name/Recipient fields
  if (lower.includes('name') || lower.includes('recipient') || lower.includes('prospect')) {
    return 'name';
  }
  
  // Email fields
  if (lower.includes('email') || lower.includes('mail')) {
    return 'email';
  }
  
  // Message/Text fields
  if (lower.includes('message') || lower.includes('summary') || lower.includes('description') || 
      lower.includes('text') || lower.includes('content') || lower.includes('note')) {
    return 'message';
  }
  
  return 'general';
}

function extractNameOnly(text: string): string {
  // Remove common greetings
  const withoutGreeting = text.replace(/^(Hey|Hi|Hello|Dear|To)\s+/i, '');
  
  // Extract only capitalized names (proper nouns)
  const words = withoutGreeting.split(/\s+/);
  const names = words.filter(word => {
    const cleaned = word.replace(/[.,!?;:'"]/g, '');
    // Only keep capitalized words that look like names
    return /^[A-Z][a-z]+$/.test(cleaned);
  });
  
  return names.join(' ');
}

function extractEmailOnly(text: string): string {
  // Extract email addresses
  const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
  const match = text.match(emailPattern);
  return match ? match[0] : text;
}

function filterGibberish(text: string, fieldName?: string): string {
  // Split into segments
  const segments = text.split(/\s+/).filter(s => s.trim().length > 0);
  
  // Use context-aware analysis
  const meaningful = analyzeContext(segments);
  
  // Reconstruct text
  let cleaned = meaningful.join(' ');
  
  // Apply field-specific intelligence
  if (fieldName) {
    const fieldType = detectFieldType(fieldName);
    
    switch (fieldType) {
      case 'name':
        // For name/recipient fields, extract only names
        cleaned = extractNameOnly(cleaned);
        break;
      case 'email':
        // For email fields, extract only email addresses
        cleaned = extractEmailOnly(cleaned);
        break;
      case 'message':
        // For message fields, apply grammar fixes
        cleaned = fixGrammar(cleaned);
        break;
      default:
        // General fields get basic cleanup
        cleaned = cleaned.trim();
    }
  } else {
    // No field context, apply grammar fixes as default
    cleaned = fixGrammar(cleaned);
  }
  
  return cleaned;
}

/**
 * Module 1: Goal Deduction Module
 * Identifies the User's Intention
 * Automatically determines the Terminal Success State (Z) by analyzing
 * the final moments of the teaching session.
 */
export function deduceGoal(actions: RecordedAction[]): FinalState {
  const finalState: FinalState = {
    completedTasks: [],
    formValues: {},
    timestamp: Date.now(),
  };

  // Analyze the end result by looking at final state of all targets
  const targetStates = new Map<string, { value: any; timestamp: number }>();

  // Process all actions to get final state of each target
  actions.forEach(action => {
    const existing = targetStates.get(action.target);
    
    // Keep the latest action for each target
    if (!existing || action.timestamp > existing.timestamp) {
      targetStates.set(action.target, {
        value: action.value,
        timestamp: action.timestamp,
      });
    }
  });

  // Build the final state
  targetStates.forEach((state, target) => {
    if (target.startsWith('task-') && state.value === true) {
      finalState.completedTasks.push(target);
    } else if (typeof state.value === 'string' && state.value.trim() !== '') {
      // Filter gibberish from form values when building goal state
      const filtered = filterGibberish(state.value, target);
      if (filtered.trim().length > 0) {
        finalState.formValues[target] = filtered;
      }
    }
  });

  return finalState;
}

/**
 * Module 2: Backward Tracing Module
 * Maps Causal Necessity
 * Traces backward from Z to preserve only the actions that were
 * causally required to achieve the goal.
 */
export function traceBackward(
  actions: RecordedAction[],
  goal: FinalState
): RecordedAction[] {
  const keepList: RecordedAction[] = [];
  const necessaryTargets = new Set<string>();

  // Identify all targets that are part of the goal state
  goal.completedTasks.forEach(taskId => necessaryTargets.add(taskId));
  Object.keys(goal.formValues).forEach(field => necessaryTargets.add(field));

  // Trace backward: find the last action for each necessary target
  const targetToLastAction = new Map<string, RecordedAction>();

  actions.forEach(action => {
    if (necessaryTargets.has(action.target)) {
      const existing = targetToLastAction.get(action.target);
      
      // Keep only the final action for each target (the one that matches goal state)
      if (!existing || action.timestamp > existing.timestamp) {
        const shouldKeep = 
          (action.type === 'toggle' && goal.completedTasks.includes(action.target)) ||
          (action.type === 'input' && typeof action.value === 'string' && 
           filterGibberish(action.value, action.target) === goal.formValues[action.target]);
        
        if (shouldKeep) {
          targetToLastAction.set(action.target, action);
        }
      }
    }
  });

  // Convert to list, preserving chronological order
  const sortedActions = Array.from(targetToLastAction.values()).sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return sortedActions;
}

/**
 * Module 3: Noise Pruning Module
 * Filters Out Mistakes and Noise
 * Removes all data that did not contribute to the final success,
 * strictly enforcing the Learning Law.
 */
export function pruneNoise(
  rawLog: RecordedAction[],
  keepList: RecordedAction[]
): RecordedAction[] {
  // Create a set of actions to keep (by timestamp + target for uniqueness)
  const keepSet = new Set(
    keepList.map(action => `${action.timestamp}-${action.target}`)
  );

  // Filter: only return actions that are in the keep list
  const refinedScript = rawLog.filter(action => 
    keepSet.has(`${action.timestamp}-${action.target}`)
  );

  // Additional noise removal: eliminate redundant actions
  const uniqueTargets = new Map<string, RecordedAction>();
  
  refinedScript.forEach(action => {
    const existing = uniqueTargets.get(action.target);
    
    // Keep only the latest meaningful action for each target
    if (!existing || action.timestamp > existing.timestamp) {
      // Apply gibberish filtering to input values
      if (action.type === 'input' && typeof action.value === 'string') {
        uniqueTargets.set(action.target, {
          ...action,
          value: filterGibberish(action.value, action.target)
        });
      } else {
        uniqueTargets.set(action.target, action);
      }
    }
  });

  // Return in chronological order, filtering out actions with empty values
  return Array.from(uniqueTargets.values())
    .filter(action => {
      // Keep toggle actions
      if (action.type === 'toggle') return true;
      // Keep input actions only if they have meaningful content after filtering
      if (action.type === 'input' && typeof action.value === 'string') {
        return action.value.trim().length > 0;
      }
      return true;
    })
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Master Processing Function
 * Orchestrates all three modules to transform raw recordings into refined automation
 */
export function processRecording(rawLog: RecordedAction[]): RecordedAction[] {
  if (rawLog.length === 0) return [];

  // Module 1: Deduce the goal from the final state
  const goal = deduceGoal(rawLog);

  // Module 2: Trace backward to find causally necessary actions
  const keepList = traceBackward(rawLog, goal);

  // Module 3: Prune all noise and mistakes
  const refinedScript = pruneNoise(rawLog, keepList);

  return refinedScript;
}

/**
 * Generates a human-readable description of what the task does
 */
export function describeTask(actions: RecordedAction[]): string {
  if (actions.length === 0) return 'No actions recorded';

  const descriptions: string[] = [];
  
  actions.forEach(action => {
    if (action.type === 'toggle' && action.value === true) {
      descriptions.push('complete a task');
    } else if (action.type === 'input' && typeof action.value === 'string') {
      descriptions.push('fill a form field');
    }
  });

  const uniqueDescriptions = Array.from(new Set(descriptions));
  
  if (uniqueDescriptions.length === 0) return 'Perform actions';
  if (uniqueDescriptions.length === 1) return uniqueDescriptions[0];
  
  return uniqueDescriptions.join(' and ');
}