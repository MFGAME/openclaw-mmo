/**
 * NPC 商店 UI 组件
 *
 * 基于 Tuxemon 的商店系统 UI
 *
 * 功能：
 * - 商品列表展示（图标、名称、价格）
 * - 购买/出售交互面板
 * - 货币显示（金币/钻石）
 * - 库存状态显示
 * - 与 ShopManager.ts 集成
 */

import { ShopManager, ShopItem, ShopData, ShopFilter } from '../engine/ShopManager.js';
import { ItemData, ItemCategory } from '../engine/ItemData.js';
import { CurrencySystem, CurrencyType } from '../engine/CurrencySystem.js';

/**
 * 商店 UI 模式
 */
export enum ShopUIMode {
  /** 购买模式 */
  BUY = 'buy',
  /** 出售模式 */
  SELL = 'sell',
}

/**
 * 商店操作类型
 */
export enum ShopAction {
  /** 确认购买/出售 */
  CONFIRM = 'confirm',
  /** 取消 */
  CANCEL = 'cancel',
  /** 切换购买/出售模式 */
  TOGGLE_MODE = 'toggle_mode',
  /** 返回 */
  BACK = 'back',
  /** 选中商品 */
  SELECT_ITEM = 'select_item',
}

/**
 * 商店 UI 回调类型
 */
export type ShopUICallback = (action: ShopAction, data?: any) => void;

/**
 * 商店 UI 配置接口
 */
export interface ShopUIConfig {
  /** 商品列表每页显示数量 */
  itemsPerPage?: number;
  /** 动画速度 */
  animationSpeed?: number;
  /** 显示商品描述 */
  showDescription?: boolean;
  /** 显示分类标签 */
  showCategory?: boolean;
}

/**
 * 商品列表项接口
 */
export interface ShopListItem {
  /** 商品数据 */
  shopItem: ShopItem;
  /** 商品索引 */
  index: number;
  /** 是否可购买 */
  canBuy: boolean;
  /** 是否可出售 */
  canSell: boolean;
  /** 玩家拥有数量（出售模式） */
  playerQuantity?: number;
}

/**
 * 商店 UI 类
 *
 * 单例模式，管理商店界面的显示和交互
 */
export class ShopUI {
  private static instance: ShopUI;

  /** UI 配置 */
  private config: ShopUIConfig;

  /** 当前显示的商店 */
  private currentShop: ShopData | null = null;

  /** 当前商品列表 */
  private currentItems: ShopItem[] = [];

  /** 当前显示的商品列表（分页后） */
  private displayedItems: ShopListItem[] = [];

  /** 当前 UI 模式 */
  private currentMode: ShopUIMode = ShopUIMode.BUY;

  /** 当前选中的商品索引 */
  private selectedIndex: number = 0;

  /** 当前页码 */
  private currentPage: number = 0;

  /** 购买数量 */
  private buyQuantity: number = 1;

  /** 是否显示购买数量选择 */
  private showQuantitySelector: boolean = false;

  /** 玩家 ID */
  private playerId: string = 'player';

  /** 玩家背包（用于出售模式） */
  private playerInventory: Map<string, number> = new Map();

  /** UI 回调 */
  private callback: ShopUICallback = () => {};

  /** 是否可见 */
  private visible: boolean = false;

  /** 动画进度 */
  private animationProgress: number = 0;

  /** 选中的分类 */
  private selectedCategory: ItemCategory | null = null;

  /** 搜索关键词 */
  private searchQuery: string = '';

  /**
   * 私有构造函数
   */
  private constructor() {
    this.config = {
      itemsPerPage: 8,
      animationSpeed: 0.3,
      showDescription: true,
      showCategory: true,
    };
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ShopUI {
    if (!ShopUI.instance) {
      ShopUI.instance = new ShopUI();
    }
    return ShopUI.instance;
  }

  /**
   * 初始化 UI
   */
  initialize(config?: Partial<ShopUIConfig>): void {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('[ShopUI] 初始化完成');
  }

  /**
   * 打开商店
   * @param shopId 商店 ID
   * @param playerId 玩家 ID
   * @param playerInventory 玩家背包数据
   */
  openShop(shopId: string, playerId: string, playerInventory: Map<string, number>): boolean {
    const shop = ShopManager.getInstance().getShop(shopId);
    if (!shop) {
      console.error(`[ShopUI] 商店 ${shopId} 不存在`);
      return false;
    }

    this.currentShop = shop;
    this.playerId = playerId;
    this.playerInventory = playerInventory;
    this.currentMode = ShopUIMode.BUY;
    this.selectedIndex = 0;
    this.currentPage = 0;
    this.buyQuantity = 1;
    this.showQuantitySelector = false;
    this.selectedCategory = null;
    this.searchQuery = '';

    this.loadShopItems();
    this.visible = true;
    this.animationProgress = 0;

    console.log(`[ShopUI] 打开商店: ${shop.name}`);
    return true;
  }

  /**
   * 关闭商店
   */
  closeShop(): void {
    this.visible = false;
    this.currentShop = null;
    this.currentItems = [];
    this.displayedItems = [];
    console.log('[ShopUI] 关闭商店');
  }

  /**
   * 切换 UI 模式（购买/出售）
   */
  toggleMode(): void {
    if (this.currentMode === ShopUIMode.BUY) {
      this.currentMode = ShopUIMode.SELL;
    } else {
      this.currentMode = ShopUIMode.BUY;
    }
    this.selectedIndex = 0;
    this.currentPage = 0;
    this.buyQuantity = 1;
    this.showQuantitySelector = false;
    this.loadShopItems();
    console.log(`[ShopUI] 切换到 ${this.currentMode} 模式`);
  }

  /**
   * 加载商店商品列表
   */
  private loadShopItems(): void {
    if (!this.currentShop) return;

    if (this.currentMode === ShopUIMode.BUY) {
      // 购买模式：显示商店商品
      const filter: ShopFilter = {
        inStockOnly: true,
        category: this.selectedCategory ?? undefined,
        searchQuery: this.searchQuery || undefined,
      };
      this.currentItems = ShopManager.getInstance().getShopItems(this.currentShop.shopId, filter);
    } else {
      // 出售模式：显示玩家背包中的可出售物品
      this.currentItems = this.getSellableItems();
    }

    this.updateDisplayedItems();
  }

  /**
   * 获取可出售的物品列表
   */
  private getSellableItems(): ShopItem[] {
    const sellableItems: ShopItem[] = [];
    const shop = this.currentShop!;

    // 遍历玩家背包
    for (const [itemId, quantity] of this.playerInventory.entries()) {
      if (quantity <= 0) continue;

      void ShopManager.getInstance().getShop(shop.shopId)?.items.find(
        item => item.itemId === itemId
      );

      // 检查此商店是否收购此分类的物品
      const itemDataLoader = this.getItemData(itemId);
      if (itemDataLoader && shop.sellableCategories.includes(itemDataLoader.category)) {
        sellableItems.push({
          itemId,
          itemData: itemDataLoader,
          price: itemDataLoader.price,
          stock: quantity,
          limited: false,
        });
      }
    }

    return sellableItems;
  }

  /**
   * 获取道具数据
   */
  private getItemData(_itemId: string): ItemData | null {
    // 这里需要实际的道具加载器，暂时返回 null
    return null;
  }

  /**
   * 更新显示的商品列表（分页）
   */
  private updateDisplayedItems(): void {
    const startIndex = this.currentPage * this.config.itemsPerPage!;
    const endIndex = startIndex + this.config.itemsPerPage!;

    this.displayedItems = this.currentItems
      .slice(startIndex, endIndex)
      .map((shopItem, index) => {
        const playerQuantity = this.playerInventory.get(shopItem.itemId) || 0;

        // 检查玩家是否有足够的金币购买
        const price = shopItem.price ?? (shopItem.itemData?.price ?? 0);
        const playerGold = CurrencySystem.getInstance().getBalance(this.playerId, CurrencyType.GOLD);
        const canBuy = playerGold >= price;

        return {
          shopItem,
          index: startIndex + index,
          canBuy,
          canSell: playerQuantity > 0,
          playerQuantity,
        };
      });
  }

  /**
   * 处理用户输入
   */
  handleInput(action: 'up' | 'down' | 'left' | 'right' | 'confirm' | 'cancel' | 'any'): void {
    if (!this.visible) return;

    switch (action) {
      case 'up':
        this.selectPrevious();
        break;
      case 'down':
        this.selectNext();
        break;
      case 'left':
        if (this.showQuantitySelector) {
          this.adjustQuantity(-1);
        } else {
          this.previousPage();
        }
        break;
      case 'right':
        if (this.showQuantitySelector) {
          this.adjustQuantity(1);
        } else {
          this.nextPage();
        }
        break;
      case 'confirm':
        this.handleConfirm();
        break;
      case 'cancel':
        this.handleCancel();
        break;
    }
  }

  /**
   * 选中上一个商品
   */
  private selectPrevious(): void {
    if (this.selectedIndex > 0) {
      this.selectedIndex--;
    } else if (this.currentPage > 0) {
      this.previousPage();
      this.selectedIndex = this.displayedItems.length - 1;
    }
  }

  /**
   * 选中下一个商品
   */
  private selectNext(): void {
    if (this.selectedIndex < this.displayedItems.length - 1) {
      this.selectedIndex++;
    } else if (this.currentPage < this.getTotalPages() - 1) {
      this.nextPage();
      this.selectedIndex = 0;
    }
  }

  /**
   * 上一页
   */
  private previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.selectedIndex = 0;
      this.updateDisplayedItems();
    }
  }

  /**
   * 下一页
   */
  private nextPage(): void {
    if (this.currentPage < this.getTotalPages() - 1) {
      this.currentPage++;
      this.selectedIndex = 0;
      this.updateDisplayedItems();
    }
  }

  /**
   * 获取总页数
   */
  private getTotalPages(): number {
    return Math.ceil(this.currentItems.length / this.config.itemsPerPage!);
  }

  /**
   * 调整购买数量
   */
  private adjustQuantity(delta: number): void {
    this.buyQuantity = Math.max(1, this.buyQuantity + delta);

    const selectedItem = this.getSelectedItem();
    if (selectedItem) {
      const maxQuantity = this.currentMode === ShopUIMode.BUY
        ? selectedItem.shopItem.stock === -1 ? 99 : selectedItem.shopItem.stock
        : selectedItem.playerQuantity || 1;

      // 限制最大购买数量
      this.buyQuantity = Math.min(this.buyQuantity, maxQuantity);
    }
  }

  /**
   * 处理确认键
   */
  private handleConfirm(): void {
    const selectedItem = this.getSelectedItem();

    if (!selectedItem) {
      return;
    }

    if (this.showQuantitySelector) {
      // 确认购买/出售
      if (this.currentMode === ShopUIMode.BUY) {
        this.purchaseItem(selectedItem);
      } else {
        this.sellItem(selectedItem);
      }
      this.showQuantitySelector = false;
      this.buyQuantity = 1;
    } else {
      // 进入数量选择模式
      this.showQuantitySelector = true;
      this.buyQuantity = 1;
    }

    this.callback(ShopAction.SELECT_ITEM, {
      itemId: selectedItem.shopItem.itemId,
      quantity: this.buyQuantity,
      mode: this.currentMode,
    });
  }

  /**
   * 处理取消键
   */
  private handleCancel(): void {
    if (this.showQuantitySelector) {
      // 退出数量选择模式
      this.showQuantitySelector = false;
      this.buyQuantity = 1;
    } else {
      // 切换购买/出售模式或关闭商店
      if (this.currentMode === ShopUIMode.BUY) {
        this.toggleMode();
      } else {
        this.toggleMode();
      }
    }
  }

  /**
   * 获取当前选中的商品
   */
  private getSelectedItem(): ShopListItem | null {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.displayedItems.length) {
      return this.displayedItems[this.selectedIndex];
    }
    return null;
  }

  /**
   * 购买商品
   */
  private purchaseItem(item: ShopListItem): void {
    const shopItem = item.shopItem;
    const quantity = this.buyQuantity;

    // 计算总价
    const price = shopItem.price ?? (shopItem.itemData?.price ?? 0);
    const totalPrice = price * quantity;

    // 检查玩家金币
    const playerGold = CurrencySystem.getInstance().getBalance(this.playerId, CurrencyType.GOLD);
    if (playerGold < totalPrice) {
      console.log('[ShopUI] 金币不足');
      return;
    }

    // 检查库存
    if (shopItem.stock !== -1 && shopItem.stock < quantity) {
      console.log('[ShopUI] 库存不足');
      return;
    }

    // 执行购买
    const result = ShopManager.getInstance().buyItem(
      this.playerId,
      shopItem.itemId,
      quantity,
      (_playerId: string, _itemId: string, _qty: number) => true // 简化：总是成功添加道具
    );

    if (result.success) {
      console.log(`[ShopUI] 购买成功: ${shopItem.itemId} x${quantity}`);
      this.loadShopItems(); // 刷新商品列表（库存可能变化）
    } else {
      console.log(`[ShopUI] 购买失败: ${result.error}`);
    }
  }

  /**
   * 出售商品
   */
  private sellItem(item: ShopListItem): void {
    const shopItem = item.shopItem;
    const quantity = Math.min(this.buyQuantity, item.playerQuantity || 0);

    if (quantity <= 0) {
      console.log('[ShopUI] 道具数量不足');
      return;
    }

    // 执行出售
    const result = ShopManager.getInstance().sellItem(
      this.playerId,
      shopItem.itemId,
      quantity,
      (_playerId: string, _itemId: string, _qty: number) => true // 简化：总是成功移除道具
    );

    if (result.success) {
      console.log(`[ShopUI] 出售成功: ${shopItem.itemId} x${quantity}`);
      // 更新玩家背包数量
      const currentQty = this.playerInventory.get(shopItem.itemId) || 0;
      this.playerInventory.set(shopItem.itemId, Math.max(0, currentQty - quantity));
      this.loadShopItems(); // 刷新商品列表
    } else {
      console.log(`[ShopUI] 出售失败: ${result.error}`);
    }
  }

  /**
   * 设置 UI 回调
   */
  setCallback(callback: ShopUICallback): void {
    this.callback = callback;
  }

  /**
   * 更新 UI
   */
  update(deltaTime: number): void {
    if (this.visible && this.animationProgress < 1) {
      this.animationProgress += deltaTime * this.config.animationSpeed!;
      if (this.animationProgress > 1) {
        this.animationProgress = 1;
      }
    }
  }

  /**
   * 渲染 UI
   */
  render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    if (!this.visible) return;

    // 应用动画缩放
    const scale = this.easeOutBack(this.animationProgress);
    const centerX = width / 2;
    const centerY = height / 2;
    const shopWidth = 600;
    const shopHeight = 450;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    // 渲染商店背景
    this.renderShopBackground(ctx, centerX, centerY, shopWidth, shopHeight);

    // 渲染标题栏
    this.renderTitleBar(ctx, centerX, centerY - shopHeight / 2, shopWidth);

    // 渲染货币显示
    this.renderCurrencyDisplay(ctx, centerX - shopWidth / 2 + 20, centerY - shopHeight / 2 + 50);

    // 渲染模式切换按钮
    this.renderModeToggle(ctx, centerX + shopWidth / 2 - 120, centerY - shopHeight / 2 + 50);

    // 渲染商品列表
    this.renderItemsList(ctx, centerX - shopWidth / 2 + 20, centerY - shopHeight / 2 + 100, shopWidth - 40, 250);

    // 渲染商品详情
    this.renderItemDetails(ctx, centerX, centerY + shopHeight / 2 - 80, shopWidth - 40);

    // 渲染数量选择器
    if (this.showQuantitySelector) {
      this.renderQuantitySelector(ctx, centerX, centerY);
    }

    // 渲染操作提示
    this.renderActionHints(ctx, centerX, centerY + shopHeight / 2 - 25);

    ctx.restore();
  }

  /**
   * 渲染商店背景
   */
  private renderShopBackground(
    ctx: CanvasRenderingContext2D,
    centerX: number,
    centerY: number,
    width: number,
    height: number
  ): void {
    const x = centerX - width / 2;
    const y = centerY - height / 2;

    // 主背景
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x, y, width, height);

    // 边框
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, width, height);

    // 内边框
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 2, y + 2, width - 4, height - 4);

    // 顶部装饰条
    const gradient = ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, '#3b82f6');
    gradient.addColorStop(0.5, '#60a5fa');
    gradient.addColorStop(1, '#3b82f6');
    ctx.fillStyle = gradient;
    ctx.fillRect(x, y, width, 8);
  }

  /**
   * 渲染标题栏
   */
  private renderTitleBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.currentShop?.name || '商店', x + width / 2, y + 25);

    // 商店描述
    if (this.config.showDescription && this.currentShop?.description) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial';
      ctx.fillText(this.currentShop.description, x + width / 2, y + 45);
    }
  }

  /**
   * 渲染货币显示
   */
  private renderCurrencyDisplay(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const gold = CurrencySystem.getInstance().getBalance(this.playerId, CurrencyType.GOLD);
    const diamond = CurrencySystem.getInstance().getBalance(this.playerId, CurrencyType.DIAMOND);

    // 金币图标和数量
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x + 10, y + 10, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${gold}`, x + 25, y + 10);

    // 钻石图标和数量
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.moveTo(x + 80, y + 2);
    ctx.lineTo(x + 88, y + 10);
    ctx.lineTo(x + 80, y + 18);
    ctx.lineTo(x + 72, y + 10);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillText(`${diamond}`, x + 95, y + 10);
  }

  /**
   * 渲染模式切换按钮
   */
  private renderModeToggle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const buyColor = this.currentMode === ShopUIMode.BUY ? '#22c55e' : '#64748b';
    const sellColor = this.currentMode === ShopUIMode.SELL ? '#ef4444' : '#64748b';

    ctx.fillStyle = buyColor;
    ctx.fillRect(x, y, 50, 25);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('购买', x + 25, y + 12);

    ctx.fillStyle = sellColor;
    ctx.fillRect(x + 55, y, 50, 25);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('出售', x + 80, y + 12);
  }

  /**
   * 渲染商品列表
   */
  private renderItemsList(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    // 列表背景
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, width, height);

    // 渲染每个商品项
    const itemHeight = 30;
    for (let i = 0; i < this.displayedItems.length; i++) {
      const item = this.displayedItems[i];
      const itemY = y + i * itemHeight;
      const isSelected = i === this.selectedIndex;

      // 选中高亮
      if (isSelected) {
        ctx.fillStyle = '#1e40af';
        ctx.fillRect(x + 2, itemY + 2, width - 4, itemHeight - 4);
      }

      // 商品名称
      ctx.fillStyle = isSelected ? '#ffffff' : '#cbd5e1';
      ctx.font = '13px Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(item.shopItem.itemData?.name || item.shopItem.itemId, x + 10, itemY + itemHeight / 2);

      // 价格
      const price = item.shopItem.price ?? (item.shopItem.itemData?.price ?? 0);
      ctx.textAlign = 'right';
      ctx.fillText(`${price}G`, x + width - 10, itemY + itemHeight / 2);

      // 分类标签
      if (this.config.showCategory && item.shopItem.itemData) {
        const categoryColor = this.getCategoryColor(item.shopItem.itemData.category);
        ctx.fillStyle = categoryColor;
        ctx.fillRect(x + width - 80, itemY + 5, 70, 20);
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.getCategoryName(item.shopItem.itemData.category), x + width - 45, itemY + 15);
      }

      // 玩家拥有数量（出售模式）
      if (this.currentMode === ShopUIMode.SELL && item.playerQuantity) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`拥有: ${item.playerQuantity}`, x + width - 100, itemY + itemHeight / 2);
      }

      // 库存状态
      if (item.shopItem.stock !== -1) {
        const stockColor = item.shopItem.stock > 0 ? '#22c55e' : '#ef4444';
        ctx.fillStyle = stockColor;
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`库存: ${item.shopItem.stock}`, x + width - 120, itemY + itemHeight / 2);
      }
    }

    // 页码
    const totalPages = this.getTotalPages();
    if (totalPages > 1) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${this.currentPage + 1} / ${totalPages}`, x + width / 2, y + height + 20);
    }

    // 搜索框（显示搜索关键词）
    if (this.searchQuery) {
      ctx.fillStyle = '#475569';
      ctx.fillRect(x, y + height + 30, width, 25);
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`搜索: ${this.searchQuery}`, x + 10, y + height + 42);
    }
  }

  /**
   * 渲染商品详情
   */
  private renderItemDetails(ctx: CanvasRenderingContext2D, x: number, y: number, width: number): void {
    const selectedItem = this.getSelectedItem();

    if (!selectedItem) return;

    const shopItem = selectedItem.shopItem;
    const itemData = shopItem.itemData;

    // 详情背景
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - width / 2, y, width, 80);
    ctx.strokeStyle = '#334155';
    ctx.strokeRect(x - width / 2, y, width, 80);

    // 商品名称
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(itemData?.name || shopItem.itemId, x - width / 2 + 10, y + 20);

    // 商品描述
    if (this.config.showDescription && itemData?.description) {
      ctx.fillStyle = '#94a3b8';
      ctx.font = '12px Arial';
      const maxWidth = width - 20;
      const words = itemData.description.split(' ');
      let line = '';
      let lineY = y + 40;

      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          ctx.fillText(line, x - width / 2 + 10, lineY);
          line = word + ' ';
          lineY += 14;
          if (lineY > y + 70) break;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, x - width / 2 + 10, lineY);
    }

    // 价格信息
    const price = shopItem.price ?? (itemData?.price ?? 0);
    const totalPrice = price * this.buyQuantity;
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`单价: ${price}G`, x + width / 2 - 10, y + 20);

    if (this.buyQuantity > 1) {
      ctx.fillStyle = '#ef4444';
      ctx.fillText(`总价: ${totalPrice}G (${this.buyQuantity}x)`, x + width / 2 - 10, y + 40);
    }
  }

  /**
   * 渲染数量选择器
   */
  private renderQuantitySelector(ctx: CanvasRenderingContext2D, centerX: number, centerY: number): void {
    const boxWidth = 200;
    const boxHeight = 100;
    const x = centerX - boxWidth / 2;
    const y = centerY - boxHeight / 2;

    // 半透明背景
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(x, y, boxWidth, boxHeight);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, boxWidth, boxHeight);

    // 标题
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('购买数量', centerX, y + 25);

    // 数量显示
    ctx.font = 'bold 32px Arial';
    ctx.fillStyle = '#3b82f6';
    ctx.fillText(`${this.buyQuantity}`, centerX, y + 60);

    // 操作提示
    ctx.font = '12px Arial';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('← 调整数量 →', centerX, y + 85);
  }

  /**
   * 渲染操作提示
   */
  private renderActionHints(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial';
    ctx.textAlign = 'center';

    if (this.showQuantitySelector) {
      ctx.fillText('← 调整数量 | Enter: 确认 | Esc: 取消', x, y);
    } else {
      ctx.fillText('↑↓: 选择商品 | ←→: 翻页 | Enter: 选择 | Esc: 切换模式', x, y);
    }
  }

  /**
   * 获取分类颜色
   */
  private getCategoryColor(category: ItemCategory): string {
    switch (category) {
      case ItemCategory.CONSUMABLE:
        return '#22c55e';
      case ItemCategory.MEDICINE:
        return '#ef4444';
      case ItemCategory.BALL:
        return '#3b82f6';
      case ItemCategory.EQUIPMENT:
        return '#f59e0b';
      case ItemCategory.KEY_ITEM:
        return '#a855f7';
      default:
        return '#64748b';
    }
  }

  /**
   * 获取分类名称
   */
  private getCategoryName(category: ItemCategory): string {
    switch (category) {
      case ItemCategory.CONSUMABLE:
        return '消耗品';
      case ItemCategory.MEDICINE:
        return '药品';
      case ItemCategory.BALL:
        return '球类';
      case ItemCategory.EQUIPMENT:
        return '装备';
      case ItemCategory.KEY_ITEM:
        return '关键道具';
      case ItemCategory.GEM:
        return '宝石';
      case ItemCategory.MATERIAL:
        return '材料';
      default:
        return '其他';
    }
  }

  /**
   * 缓动函数：easeOutBack
   */
  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  /**
   * 检查是否可见
   */
  isVisible(): boolean {
    return this.visible;
  }

  /**
   * 获取当前模式
   */
  getCurrentMode(): ShopUIMode {
    return this.currentMode;
  }

  /**
   * 设置搜索关键词
   */
  setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.loadShopItems();
  }

  /**
   * 设置分类筛选
   */
  setCategoryFilter(category: ItemCategory | null): void {
    this.selectedCategory = category;
    this.currentPage = 0;
    this.selectedIndex = 0;
    this.loadShopItems();
  }
}

/**
 * 导出商店 UI 单例
 */
export const shopUI = ShopUI.getInstance();
