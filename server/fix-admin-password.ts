import { db } from "./db";
import { hashPassword } from "./auth";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * This script fixes the admin password by updating it to use a proper hash
 */
async function fixAdminPassword() {
  try {
    // Generate a properly hashed password
    const hashedPassword = await hashPassword("adminpassword");
    
    console.log("Generated new hashed password for admin user");
    
    // Update the admin user with the hashed password
    const result = await db
      .update(users)
      .set({
        password: hashedPassword,
        role: "admin", // Ensure the admin has the correct role
      })
      .where(eq(users.username, "admin"))
      .returning({ id: users.id, username: users.username });
    
    if (result.length) {
      console.log(`Updated admin user (ID: ${result[0].id})`);
      console.log("Admin user can now log in with username 'admin' and password 'adminpassword'");
    } else {
      console.log("No admin user found to update");
    }
  } catch (error) {
    console.error("Error updating admin password:", error);
  }
}

// Run the function
fixAdminPassword()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });