const firebaseAuth = require("../config/firebase-admin");
const pool = require("../config/db");

async function verifyToken(req, res, next) {

    try {

        // Get Firebase token
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {

            return res.status(401).json({
                error: "Unauthorized"
            });

        }

        const idToken = authHeader.substring(7);

        // Verify Firebase token
        const decodedToken =
            await firebaseAuth.verifyIdToken(idToken);

        // Check if user is an authorized Head
        const result = await pool.query(
            "SELECT id, name, email FROM heads WHERE LOWER(email) = LOWER($1)",
            [decodedToken.email]
        );

        if (result.rows.length === 0) {

            console.log(
                "Unauthorized Head:",
                decodedToken.email
            );

            return res.status(403).json({
                error: "You are not authorized as a club head"
            });
        }

        // Store authenticated user
        req.user = decodedToken;

        // Store Head information from Neon
        req.head = result.rows[0];

        next();

    } catch (error) {

        console.error("Authentication error:", error);

        return res.status(401).json({
            error: "Invalid or expired authentication"
        });

    }
}

module.exports = verifyToken;