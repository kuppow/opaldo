import {
    Address,
    Blockchain,
    BytesWriter,
    Calldata,
    encodeSelector,
    Selector,
    StoredU256,
    StoredString,
    StoredBoolean,
    AddressMap,
    NetEvent,
    OP_NET,
    SafeMath,
} from '@btc-vision/btc-runtime/runtime';
import { u256 } from '@btc-vision/as-bignum/assembly';

// ─── Storage Pointers ─────────────────────────────────────────────────────────
const PTR_OWNER         : u16 = 1;
const PTR_NAME          : u16 = 2;
const PTR_SYMBOL        : u16 = 3;
const PTR_MAX_SUPPLY    : u16 = 4;
const PTR_TOTAL_MINTED  : u16 = 5;
const PTR_MINT_PRICE    : u16 = 6;
const PTR_ROYALTY_BPS   : u16 = 7;
const PTR_PAUSED        : u16 = 8;
const PTR_TOKEN_OWNER   : u16 = 9;
const PTR_APPROVED      : u16 = 10;
const PTR_BALANCE       : u16 = 11;
const PTR_LISTING_PRICE : u16 = 12;
const PTR_LISTING_SELLER: u16 = 13;

// ─── Events ───────────────────────────────────────────────────────────────────

@final
class MintEvent extends NetEvent {
    constructor(to: Address, tokenId: u256) {
        super('Mint');
        const writer = new BytesWriter(52);
        writer.writeAddress(to);
        writer.writeU256(tokenId);
        this.setData(writer);
    }
}

@final
class TransferEvent extends NetEvent {
    constructor(from: Address, to: Address, tokenId: u256) {
        super('Transfer');
        const writer = new BytesWriter(84);
        writer.writeAddress(from);
        writer.writeAddress(to);
        writer.writeU256(tokenId);
        this.setData(writer);
    }
}

@final
class ListedEvent extends NetEvent {
    constructor(seller: Address, tokenId: u256, price: u256) {
        super('Listed');
        const writer = new BytesWriter(84);
        writer.writeAddress(seller);
        writer.writeU256(tokenId);
        writer.writeU256(price);
        this.setData(writer);
    }
}

@final
class SoldEvent extends NetEvent {
    constructor(seller: Address, buyer: Address, tokenId: u256, price: u256) {
        super('Sold');
        const writer = new BytesWriter(116);
        writer.writeAddress(seller);
        writer.writeAddress(buyer);
        writer.writeU256(tokenId);
        writer.writeU256(price);
        this.setData(writer);
    }
}

@final
class CancelledEvent extends NetEvent {
    constructor(seller: Address, tokenId: u256) {
        super('Cancelled');
        const writer = new BytesWriter(52);
        writer.writeAddress(seller);
        writer.writeU256(tokenId);
        this.setData(writer);
    }
}

// ─── Contract ─────────────────────────────────────────────────────────────────

@final
export class OPALDOMarketplace extends OP_NET {

    // ── Persistent storage ────────────────────────────────────────────────────
    private readonly _owner       : StoredU256    = new StoredU256(PTR_OWNER, u256.Zero);
    private readonly _name        : StoredString  = new StoredString(PTR_NAME, '');
    private readonly _symbol      : StoredString  = new StoredString(PTR_SYMBOL, '');
    private readonly _maxSupply   : StoredU256    = new StoredU256(PTR_MAX_SUPPLY, u256.Zero);
    private readonly _totalMinted : StoredU256    = new StoredU256(PTR_TOTAL_MINTED, u256.Zero);
    private readonly _mintPrice   : StoredU256    = new StoredU256(PTR_MINT_PRICE, u256.Zero);
    private readonly _royaltyBps  : StoredU256    = new StoredU256(PTR_ROYALTY_BPS, u256.Zero);
    private readonly _paused      : StoredBoolean = new StoredBoolean(PTR_PAUSED, false);

    // ── Maps ──────────────────────────────────────────────────────────────────
    private readonly _tokenOwner   : AddressMap<u256> = new AddressMap<u256>(PTR_TOKEN_OWNER);
    private readonly _approved     : AddressMap<u256> = new AddressMap<u256>(PTR_APPROVED);
    private readonly _balance      : AddressMap<u256> = new AddressMap<u256>(PTR_BALANCE);
    private readonly _listingPrice : AddressMap<u256> = new AddressMap<u256>(PTR_LISTING_PRICE);
    private readonly _listingSeller: AddressMap<u256> = new AddressMap<u256>(PTR_LISTING_SELLER);

    public constructor() {
        super();
        // Runs on every interaction — DO NOT put init logic here
    }

    // ─── Deployment — runs once on deploy ─────────────────────────────────────
    public override onDeployment(calldata: Calldata): void {
        const name       = calldata.readStringWithLength();
        const symbol     = calldata.readStringWithLength();
        const maxSupply  = calldata.readU256();
        const mintPrice  = calldata.readU256();
        const royaltyBps = calldata.readU256();

        this._owner.set(u256.fromBytes(Blockchain.tx.sender.toBytes(), true));
        this._name.set(name);
        this._symbol.set(symbol);
        this._maxSupply.set(maxSupply);
        this._mintPrice.set(mintPrice);
        this._royaltyBps.set(royaltyBps);
        this._totalMinted.set(u256.Zero);
        this._paused.set(false);
    }

    // ─── Method Router ────────────────────────────────────────────────────────
    public override execute(method: Selector, calldata: Calldata): BytesWriter {
        switch (method) {
            case encodeSelector('mint()'):          return this.__mint(calldata);
            case encodeSelector('buyNFT()'):        return this.__buyNFT(calldata);
            case encodeSelector('listNFT()'):       return this.__listNFT(calldata);
            case encodeSelector('cancelListing()'): return this.__cancelListing(calldata);
            case encodeSelector('transfer()'):      return this.__transfer(calldata);
            case encodeSelector('approve()'):       return this.__approve(calldata);
            case encodeSelector('ownerOf()'):       return this.__ownerOf(calldata);
            case encodeSelector('balanceOf()'):     return this.__balanceOf(calldata);
            case encodeSelector('totalSupply()'):   return this.__totalSupply();
            case encodeSelector('name()'):          return this.__name();
            case encodeSelector('symbol()'):        return this.__symbol();
            case encodeSelector('setPaused()'):     return this.__setPaused(calldata);
            case encodeSelector('setMintPrice()'):  return this.__setMintPrice(calldata);
            default:
                return super.execute(method, calldata);
        }
    }

    // ─── mint() ───────────────────────────────────────────────────────────────
    private __mint(calldata: Calldata): BytesWriter {
        if (this._paused.get()) throw new Error('OPALDO: Minting paused');

        const to        = calldata.readAddress();
        const minted    = this._totalMinted.get();
        const maxSupply = this._maxSupply.get();

        if (u256.ge(minted, maxSupply)) throw new Error('OPALDO: Max supply reached');

        const tokenId = SafeMath.add(minted, u256.One);
        this._totalMinted.set(tokenId);
        this._tokenOwner.set(to, tokenId);

        const prevBal = this._balance.get(to);
        this._balance.set(to, prevBal ? SafeMath.add(prevBal, u256.One) : u256.One);

        this.emitEvent(new MintEvent(to, tokenId));

        const writer = new BytesWriter(32);
        writer.writeU256(tokenId);
        return writer;
    }

    // ─── listNFT() ────────────────────────────────────────────────────────────
    private __listNFT(calldata: Calldata): BytesWriter {
        const seller  = Blockchain.tx.sender;
        const tokenId = calldata.readU256();
        const price   = calldata.readU256();

        const owned = this._tokenOwner.get(seller);
        if (!owned || !u256.eq(owned, tokenId)) throw new Error('OPALDO: Not token owner');
        if (u256.eq(price, u256.Zero)) throw new Error('OPALDO: Price must be > 0');

        this._listingPrice.set(seller, price);
        this._listingSeller.set(seller, tokenId);

        this.emitEvent(new ListedEvent(seller, tokenId, price));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── buyNFT() ─────────────────────────────────────────────────────────────
    private __buyNFT(calldata: Calldata): BytesWriter {
        const buyer   = Blockchain.tx.sender;
        const tokenId = calldata.readU256();
        const seller  = calldata.readAddress();

        const listedId = this._listingSeller.get(seller);
        const price    = this._listingPrice.get(seller);

        if (!listedId || !u256.eq(listedId, tokenId)) throw new Error('OPALDO: Not listed');
        if (!price || u256.eq(price, u256.Zero))       throw new Error('OPALDO: No price');

        this.__transferToken(seller, buyer, tokenId);
        this._listingPrice.delete(seller);
        this._listingSeller.delete(seller);

        const royalty      = SafeMath.div(SafeMath.mul(price, this._royaltyBps.get()), u256.fromU32(10000));
        const sellerPayout = SafeMath.sub(price, royalty);

        this.emitEvent(new SoldEvent(seller, buyer, tokenId, price));

        const writer = new BytesWriter(32);
        writer.writeU256(sellerPayout);
        return writer;
    }

    // ─── cancelListing() ──────────────────────────────────────────────────────
    private __cancelListing(calldata: Calldata): BytesWriter {
        const caller  = Blockchain.tx.sender;
        const tokenId = calldata.readU256();

        const listedId = this._listingSeller.get(caller);
        if (!listedId || !u256.eq(listedId, tokenId)) throw new Error('OPALDO: No listing');

        this._listingPrice.delete(caller);
        this._listingSeller.delete(caller);

        this.emitEvent(new CancelledEvent(caller, tokenId));

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── transfer() ───────────────────────────────────────────────────────────
    private __transfer(calldata: Calldata): BytesWriter {
        const caller  = Blockchain.tx.sender;
        const to      = calldata.readAddress();
        const tokenId = calldata.readU256();

        const owned = this._tokenOwner.get(caller);
        if (!owned || !u256.eq(owned, tokenId)) throw new Error('OPALDO: Not owner');

        this.__transferToken(caller, to, tokenId);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── approve() ────────────────────────────────────────────────────────────
    private __approve(calldata: Calldata): BytesWriter {
        const caller  = Blockchain.tx.sender;
        const tokenId = calldata.readU256();

        const owned = this._tokenOwner.get(caller);
        if (!owned || !u256.eq(owned, tokenId)) throw new Error('OPALDO: Not owner');

        this._approved.set(caller, tokenId);

        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── ownerOf() ────────────────────────────────────────────────────────────
    private __ownerOf(calldata: Calldata): BytesWriter {
        const tokenId = calldata.readU256();
        const writer  = new BytesWriter(32);
        writer.writeU256(tokenId);
        return writer;
    }

    // ─── balanceOf() ──────────────────────────────────────────────────────────
    private __balanceOf(calldata: Calldata): BytesWriter {
        const addr    = calldata.readAddress();
        const balance = this._balance.get(addr);
        const writer  = new BytesWriter(32);
        writer.writeU256(balance ? balance : u256.Zero);
        return writer;
    }

    // ─── totalSupply() ────────────────────────────────────────────────────────
    private __totalSupply(): BytesWriter {
        const writer = new BytesWriter(32);
        writer.writeU256(this._totalMinted.get());
        return writer;
    }

    // ─── name() ───────────────────────────────────────────────────────────────
    private __name(): BytesWriter {
        const writer = new BytesWriter(64);
        writer.writeStringWithLength(this._name.get());
        return writer;
    }

    // ─── symbol() ─────────────────────────────────────────────────────────────
    private __symbol(): BytesWriter {
        const writer = new BytesWriter(16);
        writer.writeStringWithLength(this._symbol.get());
        return writer;
    }

    // ─── setPaused() — owner only ─────────────────────────────────────────────
    private __setPaused(calldata: Calldata): BytesWriter {
        this.__onlyOwner();
        this._paused.set(calldata.readBoolean());
        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── setMintPrice() — owner only ──────────────────────────────────────────
    private __setMintPrice(calldata: Calldata): BytesWriter {
        this.__onlyOwner();
        this._mintPrice.set(calldata.readU256());
        const writer = new BytesWriter(1);
        writer.writeBoolean(true);
        return writer;
    }

    // ─── Internal helpers ─────────────────────────────────────────────────────
    private __transferToken(from: Address, to: Address, tokenId: u256): void {
        this._tokenOwner.delete(from);
        this._tokenOwner.set(to, tokenId);

        const fromBal = this._balance.get(from);
        if (fromBal && u256.gt(fromBal, u256.Zero)) {
            this._balance.set(from, SafeMath.sub(fromBal, u256.One));
        }

        const toBal = this._balance.get(to);
        this._balance.set(to, toBal ? SafeMath.add(toBal, u256.One) : u256.One);

        this._approved.delete(from);
        this.emitEvent(new TransferEvent(from, to, tokenId));
    }

    private __onlyOwner(): void {
        const storedOwner  = this._owner.get();
        const senderU256   = u256.fromBytes(Blockchain.tx.sender.toBytes(), true);
        if (!u256.eq(storedOwner, senderU256)) throw new Error('OPALDO: Not owner');
    }
}
