require("dotenv").config();

const express = require("express");
const pool = require("./config/db");
const verifyToken = require("./middleware/authMiddleware");

const app = express();



app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));
app.set("view engine", "ejs");


const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
    res.render("home");
});



app.get("/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        console.log(result.rows);
        res.json(result.rows);
    } catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/members", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, department
            FROM members
            ORDER BY id
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("Members API error:", error);

        res.status(500).json({
            error: error.message
        });
    }
});

app.get("/api/leaderboard", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                m.id,
                m.name,
                m.department,
                COALESCE(SUM(p.points), 0) AS total_points
            FROM members m
            LEFT JOIN points p ON m.id = p.member_id
            GROUP BY m.id, m.name, m.department
            ORDER BY total_points DESC
        `);
        res.json(result.rows);
    }
    catch (err) {
        console.error("Database error:", err);
        res.status(500).json({ error: err.message });
    }
});



// Leaderboard page
app.get("/score", async (req, res) => {
    try {
        const result = await pool.query(`
             SELECT
        m.id,
        m.name,
        m.department,
        COALESCE(SUM(p.points), 0) AS total_points,
        RANK() OVER (
            ORDER BY COALESCE(SUM(p.points), 0) DESC
        ) AS rank
    FROM members m
    LEFT JOIN points p
        ON m.id = p.member_id
    GROUP BY m.id, m.name, m.department
    ORDER BY rank;`);

        res.render("leaderboard", {
            members: result.rows
        })
    }
    catch (err) {
        console.error("Leaderboard Page Error:", err);
        res.status(500).send("Something went wrong...!");
    }
});

//Authentication

app.get("/head/login", (req, res) => {
    res.render("login");
});

//Head Dashboard

app.get("/head/dashboard", verifyToken, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, name, department
            FROM members
            ORDER BY name
        `);

        console.log("Members for dashboard:", result.rows);

        res.render("head-dashboard", {
            user: req.user,
            members: result.rows
        });

    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("Failed to load dashboard");
    }
});

app.post("/api/points", verifyToken, async (req, res) => {

    try {

        const { member_id, points, reason } = req.body;

        // Validate required fields
        if (!member_id || points === undefined || !reason) {
            return res.status(400).json({
                error: "Member, points and reason are required"
            });
        }

        // Validate points
        if (!Number.isInteger(Number(points)) || Number(points) <= 0) {
            return res.status(400).json({
                error: "Points must be a positive integer"
            });
        }

        // Check member exists
        const memberResult = await pool.query(
            "SELECT id, name FROM members WHERE id = $1",
            [member_id]
        );

        if (memberResult.rows.length === 0) {
            return res.status(404).json({
                error: "Member not found"
            });
        }

        // Insert points
        const result = await pool.query(
            `INSERT INTO points
                (member_id, points, reason, awarded_by)
             VALUES
                ($1, $2, $3, $4)
             RETURNING *`,
            [
                member_id,
                Number(points),
                reason.trim(),
                req.head.name
            ]
        );

        res.status(201).json({
            message: "Points awarded successfully",
            point: result.rows[0]
        });

    } catch (error) {

        console.error("Add points error:", error);

        res.status(500).json({
            error: "Failed to award points"
        });

    }

});

app.post("/api/members", verifyToken, async (req, res) => {

    try {

        const { name, department, email } = req.body;

        // Validate
        if (!name || !department || !email) {
            return res.status(400).json({
                error: "Name, department and email are required"
            });
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!emailRegex.test(email)) {
            return res.status(400).json({
                error: "Invalid email address"
            });
        }

        // Check duplicate email
        const existingMember = await pool.query(
            `SELECT id FROM members WHERE LOWER(email) = LOWER($1)`,
            [email.trim()]
        );

        if (existingMember.rows.length > 0) {
            return res.status(409).json({
                error: "A member with this email already exists"
            });
        }

        // Insert member
        const result = await pool.query(
            `INSERT INTO members
        (name, department, email)
     VALUES
        ($1, $2, $3)
     RETURNING id, name, department, email`,
            [
                name.trim(),
                department.trim(),
                email.trim().toLowerCase()
            ]
        );

        res.status(201).json({
            message: "Member added successfully",
            member: result.rows[0]
        });

    } catch (error) {

        console.error("Add member error:", error);

        res.status(500).json({
            error: "Failed to add member"
        });

    }

});

app.listen(PORT, () => {
    console.log(`Rise-Score running on port ${PORT}`);
});