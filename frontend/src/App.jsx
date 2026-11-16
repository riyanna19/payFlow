
import { useEffect, useState } from "react";
import "./App.css";

const products = [
  { id: 1, name: "Wireless Headphones", price: 2499, icon: "🎧" },
  { id: 2, name: "Smart Watch", price: 3999, icon: "⌚" },
  { id: 3, name: "Laptop Stand", price: 1299, icon: "💻" },
];

function App() {
  const [orders, setOrders] = useState([]);
  const [serverMessage, setServerMessage] = useState("Connecting...");
  useEffect(() => {
    fetch("http://localhost:5000/")
      .then((res) => res.json())
      .then((data) => setServerMessage(data.message))
      .catch(() => setServerMessage("Backend connection failed"));
  }, []);
  
  useEffect(() => {
    fetch("http://localhost:5000/api/orders")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to fetch orders");
        }
        return res.json();
      })
      .then((data) => setOrders(data))
      .catch((error) => {
        console.error("Failed to load orders:", error);
      });
  }, []);


  async function placeOrder(product) {
    const idempotencyKey = crypto.randomUUID();
  try {
    const response = await fetch("http://localhost:5000/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        product: product.name,
        amount: product.price,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Order failed");
    }

    setOrders((previous) =>
  previous.some((order) => order.id === data.order.id)
    ? previous
    : [data.order, ...previous]
);
  } catch (error) {
    console.error("Order failed:", error);
    alert("Order failed. Please try again.");
  }
}

  return (
    
    <main className="dashboard">
      <p className="server-status">{serverMessage}</p>
      <aside className="sidebar">
        <h2>PayFlow<span>.</span></h2>
        <p className="nav-active">▦ Overview</p>
        <p>▤ Orders</p>
        <p>⇄ Payments</p>
        <div className="sidebar-bottom">Order & Payment System</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">WORKSPACE / OVERVIEW</p>
            <h1>Order Dashboard</h1>
          </div>
          <span className="avatar">RB</span>
        </header>

        <section className="welcome">
          <div>
            <p className="eyebrow">PAYMENT OPERATIONS</p>
            <h2>Manage orders with confidence.</h2>
            <p>Track orders and monitor payment processing in one place.</p>
          </div>
          <span className="welcome-icon">↗</span>
        </section>

        <section className="stats">
          <article className="stat-card">
            <p>Total Orders</p>
            <h2>{orders.length}</h2>
            <span>Orders created in this session</span>
          </article>
          <article className="stat-card">
            <p>Total Order Value</p>
            <h2>₹{orders.reduce((sum, order) => sum + order.amount, 0).toLocaleString("en-IN")}</h2>
            <span>Value of placed orders</span>
          </article>
          <article className="stat-card">
            <p>Processing</p>
            <h2>{orders.filter((order) => order.status === "Processing").length}</h2>
            <span>Awaiting payment simulation</span>
          </article>
        </section>

        <section className="products-section">
          <div className="section-heading">
            <div>
              <h2>Test Store</h2>
              <p>Place a sample order to test the payment flow.</p>
            </div>
            <span className="demo-label">DEMO MODE</span>
          </div>

          <div className="products">
            {products.map((product) => (
              <article className="product-card" key={product.id}>
                <div className="product-icon">{product.icon}</div>
                <h3>{product.name}</h3>
                <p>₹{product.price.toLocaleString("en-IN")}</p>
                <button onClick={() => placeOrder(product)}>
                  Place Order <span>→</span>
                </button>
              </article>
            ))}
          </div>
        </section>

        <section className="orders-section">
          <div className="section-heading">
            <div>
              <h2>Recent Orders</h2>
              <p>Your latest order activity.</p>
            </div>
            <span className="order-count">{orders.length} orders</span>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ORDER ID</th>
                  <th>PRODUCT</th>
                  <th>AMOUNT</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-state">
                      No orders yet. Place a sample order above.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td>{order.id}</td>
                      <td>{order.product}</td>
                      <td>₹{order.amount.toLocaleString("en-IN")}</td>
                      <td><span className="status">{order.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
        <footer>PayFlow · Order & Payment Reliability Platform</footer>
      </section>
    </main>
  );
}

export default App;
