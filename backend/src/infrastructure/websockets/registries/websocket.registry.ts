import { Injectable } from '@nestjs/common';
import { ChannelDefinition } from '../interfaces/index.js';

@Injectable()
export class ChannelRegistry {
  private channels = new Map<string, ChannelDefinition>();

  register(def: ChannelDefinition) {
    this.channels.set(def.name, def);
  }

  get(name: string) {
    return this.channels.get(name);
  }
}
