# Player Whitelist (Non-Aggression Pact)

The whitelist lets you designate friendly players whose creeps can pass through your rooms without being attacked. Towers won't fire on them, defenders won't chase them, and ranged defenders won't engage them.

---

## How It Works

A `Memory.whitelist` array stores trusted player usernames. Every tick, the tower manager and all defender roles check this list before engaging any hostile creep. If the creep's owner is on the list, it's ignored entirely.

**Affected systems:**
| System | Behavior |
|--------|----------|
| `manager.tower.js` | Towers skip whitelisted creeps when scanning for hostiles |
| `role.defender.js` | Melee defenders don't target whitelisted creeps |
| `role.rangedDefender.js` | Ranged defenders don't target whitelisted creeps |
| Auto safe mode | Only triggers for non-whitelisted threats |

Whitelisted players can freely pass through your rooms — your base will not react to their presence at all.

---

## Console Commands

### Add a player to the whitelist
```js
Memory.whitelist = Memory.whitelist || [];
Memory.whitelist.push('Ricardo306');
```

### View current whitelist
```js
Memory.whitelist
```

### Remove a player from the whitelist
```js
Memory.whitelist = Memory.whitelist.filter(name => name !== 'Ricardo306');
```

### Clear the entire whitelist
```js
delete Memory.whitelist;
```

---

## Mutual Non-Aggression Pact (NAP)

A whitelist is only effective as a diplomatic tool if the other player reciprocates. A NAP typically means:

1. You add their username to `Memory.whitelist`
2. They add your username (`Lordachoo`) to their equivalent list
3. Neither side attacks the other's creeps or structures
4. Passage through each other's rooms is freely allowed

**This bot does not auto-enforce a NAP** — if a whitelisted player attacks your structures, you'll need to remove them from the whitelist manually and your defenses will resume normal operation.

---

## Example: Whitelisting Ricardo306

Ricardo306 is a high-rank neighbour in the shard. Adding him to the whitelist allows his creeps to pass through E13N53 and any other owned room without triggering tower fire or defender response.

```js
// Run in the Screeps in-game console
Memory.whitelist = Memory.whitelist || [];
Memory.whitelist.push('Ricardo306');
// Verify:
Memory.whitelist  // → ["Ricardo306"]
```

To revoke (e.g., if they attack you):
```js
Memory.whitelist = Memory.whitelist.filter(n => n !== 'Ricardo306');
```

---

## Implementation Notes

The whitelist check in each module follows this pattern:

```js
const whitelist = Memory.whitelist || [];
const hostiles = room.find(FIND_HOSTILE_CREEPS, {
    filter: c => !whitelist.includes(c.owner.username)
});
```

- If `Memory.whitelist` is undefined, the default is an empty array — all hostile creeps are treated normally.
- The check is username-exact (case-sensitive). Use the exact in-game username.
- Whitelist is checked every tick, so changes take effect immediately without a code push.
