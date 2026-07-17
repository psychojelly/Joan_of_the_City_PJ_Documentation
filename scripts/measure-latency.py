# Fires test tones at the glasses at a steady cadence and captures per-cue
# transit (network delay + clock error) from the debug feed, polling often
# enough to beat the 500-event ring buffer. Prints a distribution + spike map.
import json, time, urllib.request

SERVER = "http://localhost:8765"
GLASSES = "192.168.10.69"
LEAD_MS = 400
FIRE_EVERY = 1.5     # seconds between tones
DURATION = 90        # seconds

def post(path, body):
    req = urllib.request.Request(SERVER + path,
        data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    return urllib.request.urlopen(req, timeout=5).read()

def get(path):
    return json.loads(urllib.request.urlopen(SERVER + path, timeout=5).read())

seen = set()
transits = []          # (t_wall, transit_ms)
last_seq = 0
start = time.time()
next_fire = start

print(f"Measuring glasses {GLASSES} for {DURATION}s, tone every {FIRE_EVERY}s, lead {LEAD_MS}ms...")
while time.time() - start < DURATION:
    now = time.time()
    if now >= next_fire:
        try:
            post("/send", {"host": GLASSES, "port": 7000,
                           "address": "/audio/test", "value": 1, "leadMs": LEAD_MS})
        except Exception as e:
            print("fire error:", e)
        next_fire += FIRE_EVERY
    # drain new events
    try:
        d = get(f"/debug/events?since={last_seq}")
        last_seq = d.get("seq", last_seq)
        for e in d.get("events", []):
            if e["addr"] == "/debug/rx" and e["from"] == GLASSES and e["seq"] not in seen:
                seen.add(e["seq"])
                a = e["args"]
                if a[3] > 0:  # scheduled (has playAt)
                    margin_ms = (a[3] - a[2]) * 1000.0
                    transit_ms = LEAD_MS - margin_ms
                    transits.append((now - start, transit_ms))
    except Exception as e:
        pass
    time.sleep(0.3)

if not transits:
    print("No scheduled receipts captured — is reporting ON and the clock synced?")
    raise SystemExit

vals = sorted(t for _, t in transits)
n = len(vals)
def pct(p): return vals[min(n - 1, int(p / 100 * n))]
median = vals[n // 2]
mean = sum(vals) / n
p95, p99, mx, mn = pct(95), pct(99), vals[-1], vals[0]

print(f"\n=== {n} cues over {DURATION}s ===")
print(f"  min      {mn:6.0f} ms")
print(f"  median   {median:6.0f} ms")
print(f"  mean     {mean:6.0f} ms")
print(f"  p95      {p95:6.0f} ms")
print(f"  p99      {p99:6.0f} ms")
print(f"  MAX      {mx:6.0f} ms  <- worst-case; the lead must exceed this")
print(f"  jitter (p95-median) {p95 - median:.0f} ms")

# spike map: mark cues well above median
print("\n=== timeline (each cue; * = spike >2x median) ===")
for tw, tr in transits:
    bar = "#" * min(60, int(tr / 5))
    spike = " *SPIKE*" if tr > 2 * median else ""
    print(f"  t={tw:5.1f}s  {tr:5.0f}ms |{bar}{spike}")

spikes = [tr for _, tr in transits if tr > 2 * median]
print(f"\nspikes (>2x median): {len(spikes)}/{n} = {100*len(spikes)/n:.0f}% of cues")
safe_lead = int((mx + 30) / 10) * 10
print(f"\nRECOMMENDED lead to never drop a cue: {safe_lead} ms (max {mx:.0f} + margin)")
print(f"AGGRESSIVE lead (p99, rare late cue): {int((p99+20)/10)*10} ms")
