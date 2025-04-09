import { NextResponse } from "next/server";
import clientPromise from "@/app/lib/mongodb";
import bcrypt from "bcryptjs";

// Utility function to generate a unique referral code (6-character alphanumeric)
function generateReferralCode(length = 6) {
  const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const walletAddress = searchParams.get("walletAddress");

  if (!walletAddress) {
    return NextResponse.json(
      { error: "Wallet address is required" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("crypto-casino");
    const user = await db.collection("users").findOne({ walletAddress });

    if (user) {
      // Return XP, level, and referral-related fields as well
      return NextResponse.json({
        username: user.username,
        walletAddress: user.walletAddress,
        totalXp: user.totalXp || 0,
        level: user.level || 0,
        referralCode: user.referralCode || null,
        referralBonus: user.referralBonus || 0,
        referralCount: user.referralCount || 0,
      });
    } else {
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { email, username, password, walletAddress, referredBy } = await request.json();

  if (!email || !username || !password || !walletAddress) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    );
  }

  try {
    const client = await clientPromise;
    const db = client.db("crypto-casino");

    // Check for existing user with the same username, email, or wallet address
    const existingUser = await db.collection("users").findOne({
      $or: [{ username }, { email }, { walletAddress }],
    });

    if (existingUser) {
      if (existingUser.username === username) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 400 }
        );
      }
      if (existingUser.email === email) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
      if (existingUser.walletAddress === walletAddress) {
        return NextResponse.json(
          { error: "Wallet address already associated with an account" },
          { status: 400 }
        );
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode(); // Generate unique referral code for the new user

    // Award 100 XP if a referral code was provided at signup
    const newUser = {
      username,
      email,
      walletAddress,
      password: hashedPassword,
      totalXp: referredBy ? 100 : 0, // Updated here: assign 100 XP when using a referral code
      level: 0,
      referralCode,
      referredBy: referredBy || null,
      referralBonus: 0,
      referralCount: 0,
      createdAt: new Date(),
    };

    await db.collection("users").insertOne(newUser);

    // If referredBy is provided and valid, update the referrer's referralCount
    if (referredBy) {
      const referrer = await db.collection("users").findOne({ referralCode: referredBy });
      if (referrer) {
        await db.collection("users").updateOne(
          { referralCode: referredBy },
          { $inc: { referralCount: 1 } }
        );
      }
    }

    return NextResponse.json({
      username,
      walletAddress,
      totalXp: newUser.totalXp,
      level: newUser.level,
      referralCode,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
