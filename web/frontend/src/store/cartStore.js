import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clientCartApi } from "../api/client";
import useAuthStore from "./authStore";
import { imageUrl } from "../utils/format";
import { sizeStock } from "../utils/stock";

// Khi đã đăng nhập, giỏ hàng nằm trên server (bảng cart); khách vãng lai giữ giỏ tạm trong localStorage
const isLoggedIn = () => !!useAuthStore.getState().token;

// Lỗi cùng dạng với lỗi API để apiErrorMessage đọc được
const cartError = (detail) => Object.assign(new Error(detail), { response: { data: { detail } } });
const OVER_STOCK_MSG = "Số lượng bạn chọn đã vượt quá số bánh còn lại trong tiệm.";

const fromServerItem = (i) => ({
  cart_id: i.cart_id,
  product_id: i.product_id,
  product_name: i.product_name,
  image: imageUrl(i.image),
  size_id: i.size_id,
  size_name: i.size_name,
  price: Number(i.unit_price),
  quantity: i.quantity,
  stock_quantity: i.stock_quantity,
});

const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,
      toggleCart: () => set((s) => ({ isOpen: !s.isOpen })),
      closeCart: () => set({ isOpen: false }),

      fetchCart: async () => {
        if (!isLoggedIn()) return;
        const res = await clientCartApi.getCart();
        set({ items: res.data.items.map(fromServerItem) });
      },

      // Đẩy giỏ tạm của khách vãng lai lên server ngay sau khi đăng nhập
      syncAfterLogin: async () => {
        const guestItems = get().items.filter((i) => !i.cart_id);
        for (const i of guestItems) {
          await clientCartApi.addToCart({ product_id: i.product_id, size_id: i.size_id, quantity: i.quantity });
        }
        await get().fetchCart();
      },

      resetLocal: () => set({ items: [] }),

      // Cập nhật tồn kho realtime cho các món đang nằm trong giỏ
      applyStock: (stockItems = []) =>
        set({
          items: get().items.map((i) => {
            const s = stockItems.find((x) => x.product_id === i.product_id && x.size_id === i.size_id);
            return s ? { ...i, stock_quantity: s.stock_quantity } : i;
          }),
        }),

      addItem: async (product, size, quantity = 1) => {
        if (isLoggedIn()) {
          await clientCartApi.addToCart({ product_id: product.product_id, size_id: size.size_id, quantity });
          await get().fetchCart();
          return;
        }
        const existing = get().items.find(
          (i) => i.product_id === product.product_id && i.size_id === size.size_id
        );
        if ((existing?.quantity || 0) + quantity > sizeStock(size)) throw cartError(OVER_STOCK_MSG);
        if (existing) {
          set({ items: get().items.map((i) =>
            i === existing ? { ...i, quantity: i.quantity + quantity, stock_quantity: sizeStock(size) } : i
          )});
        } else {
          set({ items: [...get().items, {
            product_id: product.product_id,
            product_name: product.product_name,
            image: product.image,
            size_id: size.size_id,
            size_name: size.size_name,
            price: Number(size.price),
            quantity,
            stock_quantity: sizeStock(size),
          }]});
        }
      },

      removeItem: async (product_id, size_id) => {
        const item = get().items.find((i) => i.product_id === product_id && i.size_id === size_id);
        if (!item) return;
        if (isLoggedIn() && item.cart_id) {
          await clientCartApi.removeItem(item.cart_id);
          await get().fetchCart();
          return;
        }
        set({ items: get().items.filter((i) => i !== item) });
      },

      updateQty: async (product_id, size_id, quantity) => {
        const item = get().items.find((i) => i.product_id === product_id && i.size_id === size_id);
        if (!item) return;
        const qty = Math.max(1, quantity);
        // Chỉ chặn khi tăng, giảm số lượng thì luôn cho phép
        if (item.stock_quantity != null && qty > item.quantity && qty > item.stock_quantity) throw cartError(OVER_STOCK_MSG);
        if (isLoggedIn() && item.cart_id) {
          await clientCartApi.updateItem(item.cart_id, qty);
          await get().fetchCart();
          return;
        }
        set({ items: get().items.map((i) => (i === item ? { ...i, quantity: qty } : i)) });
      },

      clearCart: async () => {
        if (isLoggedIn()) await clientCartApi.clearCart();
        set({ items: [] });
      },

      // Số lượng một size đang có trong giỏ, để trang chi tiết tính số còn thêm được
      quantityInCart: (product_id, size_id) =>
        get().items.find((i) => i.product_id === product_id && i.size_id === size_id)?.quantity || 0,

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalCost: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: "cart-storage", partialize: (s) => ({ items: s.items }) }
  )
);

export default useCartStore;
