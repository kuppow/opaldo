# OPALDO - Local Dev Server

## Setup (one time)

```bash
cd opaldo-server
npm install
```

## Start

```bash
npm run dev
```

Opens automatically at **http://localhost:3000**

That's it. OP_WALLET will inject normally over `http://`.

---

## No Node? Use Python instead:
```bash
python3 -m http.server 3000
```
Then open http://localhost:3000
