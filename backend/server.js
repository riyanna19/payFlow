
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});
pool.query("SELECT NOW()")
  .then((result) => {
    console.log("PostgreSQL connected successfully!");
    console.log("Database time:", result.rows[0].now);
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error.message);
  });

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ message: "EventPaymentSystem backend is running!" });
});


app.post("/api/orders", async (req, res) => {
  const { product, amount } = req.body;
  const idempotencyKey = req.get("Idempotency-Key");

  if (!idempotencyKey || idempotencyKey.trim() === "") {
    return res.status(400).json({
      message: "Idempotency-Key header is required",
    });
  }

  if (
    typeof product !== "string" ||
    product.trim() === "" ||
    typeof amount !== "number" ||
    !Number.isFinite(amount) ||
    amount <= 0
  ) {
    return res.status(400).json({
      message: "Valid product and positive amount are required",
    });
  }

  try {
    const orderId = `ORD-${Date.now()}`;

    const result = await pool.query(
      `INSERT INTO orders
         (order_id, product, amount, status, idempotency_key)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (idempotency_key)
         WHERE idempotency_key IS NOT NULL
       DO NOTHING
       RETURNING id, order_id, product, amount, status, created_at`,
      [
        orderId,
        product.trim(),
        amount,
        "Processing",
        idempotencyKey,
      ]
    );

    let savedOrder = result.rows[0];
    let isDuplicate = false;

    if (!savedOrder) {
      const existing = await pool.query(
        `SELECT id, order_id, product, amount, status, created_at
         FROM orders
         WHERE idempotency_key = $1`,
        [idempotencyKey]
      );

      if (existing.rows.length === 0) {
        return res.status(500).json({
          message: "Could not retrieve the existing order",
        });
      }

      savedOrder = existing.rows[0];
      isDuplicate = true;
    }

    return res.status(isDuplicate ? 200 : 201).json({
      message: isDuplicate
        ? "Existing order returned"
        : "Order created successfully",
      order: {
        id: savedOrder.order_id,
        product: savedOrder.product,
        amount: Number(savedOrder.amount),
        status: savedOrder.status,
        created_at: savedOrder.created_at,
      },
    });
  } catch (error) {
    console.error("Failed to save order:", error.message);
    return res.status(500).json({
      message: "Failed to save order",
    });
  }
});

app.patch("/api/orders/:orderId/status", async (req, res) => {
  const { status } = req.body;
  const allowedStatuses = ["Processing", "Successful", "Failed"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      message: "Invalid status. Use Processing, Successful or Failed",
    });
  }

  try {
    const result = await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE order_id = $2
       RETURNING order_id, product, amount, status`,
      [status, req.params.orderId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Order not found",
      });
    }

    const updatedOrder = result.rows[0];

    return res.json({
      message: "Order status updated successfully",
      order: {
        id: updatedOrder.order_id,
        product: updatedOrder.product,
        amount: Number(updatedOrder.amount),
        status: updatedOrder.status,
      },
    });
  } catch (error) {
    console.error("Failed to update order status:", error.message);
    return res.status(500).json({
      message: "Failed to update order status",
    });
  }
});

app.post("/api/orders/:orderId/pay", async (req, res) => {
  const { paymentOutcome } = req.body;

  if (!["success", "fail"].includes(paymentOutcome)) {
    return res.status(400).json({
      message: "Payment outcome must be success or fail",
    });
  }

  try {
    const newStatus =
      paymentOutcome === "success" ? "Successful" : "Failed";

    const result = await pool.query(
      `UPDATE orders
       SET status = $1
       WHERE order_id = $2 AND status = 'Processing'
       RETURNING order_id, product, amount, status`,
      [newStatus, req.params.orderId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message: "Order not found or already processed",
      });
    }

    return res.json({
      message: "Demo payment processed",
      order: result.rows[0],
    });
  } catch (error) {
    console.error("Payment simulation failed:", error.message);
    return res.status(500).json({
      message: "Payment simulation failed",
    });
  }
});





app.get("/api/orders", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, order_id, product, amount, status, created_at
       FROM orders
       ORDER BY created_at DESC`
    );

    const orders = result.rows.map((row) => ({
      id: row.order_id,
      product: row.product,
      amount: Number(row.amount),
      status: row.status,
      created_at: row.created_at,
    }));

    res.json(orders);
  } catch (error) {
    console.error("Failed to fetch orders:", error.message);
    res.status(500).json({ message: "Failed to fetch orders" });
  }
});


app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});
