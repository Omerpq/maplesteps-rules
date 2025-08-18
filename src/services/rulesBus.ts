// src/services/rulesBus.ts
import { EventEmitter } from "events";

type RulesEvents = "rules:refreshed" | "rules:cacheCleared";

class RulesBus extends EventEmitter {
  emit(event: RulesEvents, ...args: any[]): boolean { return super.emit(event, ...args); }
  on(event: RulesEvents, listener: (...args: any[]) => void): this { return super.on(event, listener); }
  off(event: RulesEvents, listener: (...args: any[]) => void): this { return super.off(event, listener); }
}

export const rulesBus = new RulesBus();
