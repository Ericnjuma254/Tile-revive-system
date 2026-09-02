import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState
} from "react";

const CartContext = createContext(null);

const CART_STORAGE_KEY = "tile_revive_cart";

export function CartProvider({ children }) {
    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart =
                localStorage.getItem(CART_STORAGE_KEY);

            return savedCart
                ? JSON.parse(savedCart)
                : [];
        } catch (error) {
            console.error("Failed to load cart:", error);
            return [];
        }
    });

    useEffect(() => {
        try {
            localStorage.setItem(
                CART_STORAGE_KEY,
                JSON.stringify(cartItems)
            );
        } catch (error) {
            console.error("Failed to save cart:", error);
        }
    }, [cartItems]);

    const addToCart = (product) => {
        setCartItems((currentItems) => {
            const existingItem = currentItems.find(
                (item) => item.id === product.id
            );

            if (existingItem) {
                return currentItems.map((item) =>
                    item.id === product.id
                        ? {
                            ...item,
                            quantity: item.quantity + 1
                        }
                        : item
                );
            }

            return [
                ...currentItems,
                {
                    ...product,
                    quantity: 1
                }
            ];
        });
    };

    const removeFromCart = (productId) => {
        setCartItems((currentItems) =>
            currentItems.filter(
                (item) => item.id !== productId
            )
        );
    };

    const updateQuantity = (productId, quantity) => {
        setCartItems((currentItems) =>
            currentItems
                .map((item) =>
                    item.id === productId
                        ? {
                            ...item,
                            quantity
                        }
                        : item
                )
                .filter(
                    (item) => item.quantity > 0
                )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const cartCount = useMemo(
        () =>
            cartItems.reduce(
                (total, item) =>
                    total + item.quantity,
                0
            ),
        [cartItems]
    );

    const cartTotal = useMemo(
        () =>
            cartItems.reduce(
                (total, item) =>
                    total +
                    Number(item.price) *
                    item.quantity,
                0
            ),
        [cartItems]
    );

    const value = {
        cartItems,
        cartCount,
        cartTotal,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);

    if (!context) {
        throw new Error(
            "useCart must be used inside a CartProvider"
        );
    }

    return context;
}
