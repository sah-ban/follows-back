import { init, fetchQuery } from "@airstack/node";
import { NextRequest, NextResponse } from "next/server";

const apiKey = process.env.AIRSTACK_API_KEY;
if (!apiKey) {
  throw new Error("AIRSTACK_API_KEY is not defined");
}
init(apiKey);

console.log("Airstack API initialized");

const isFollowingQuery = `
query isFollowing($fid: Identity!){
  Wallet(input: {identity: "fc_fid:268438"}) {
    socialFollowings(
      input: {filter: {identity: {_eq: $fid}, dappName: {_eq: farcaster}}}
    ) {
      Following {
        followingSince
      }
    }
  }
}
`;

export async function GET(req: NextRequest) {
  console.log(`API route called at ${new Date().toISOString()}`);
  console.log(`Full URL: ${req.url}`);

  const fid = req.nextUrl.searchParams.get("userId");
  console.log(`Requested userId in fb: ${fid}`);

  if (!fid) {
    console.log("Error: userId parameter is missing");
    return NextResponse.json(
      { error: "userId parameter is required" },
      { status: 400 }
    );
  }

  try {
    console.log(`Fetching if userId: ${fid} follows me or not`);
    const [userData] = await Promise.all([fetchQuery(isFollowingQuery, { fid: `fc_fid:${fid}` })]);

    if (userData.error) {
      console.error("Airstack API error (user data):", userData.error);
      return NextResponse.json(
        { error: userData.error.message },
        { status: 500 }
      );
    }

    console.log(
      "Airstack API response (user data):",
      JSON.stringify(userData.data, null, 2)
    );

    const followingData = userData.data?.Wallet?.socialFollowings?.Following;

    if (!followingData) {
      console.log("doesnt follow you");
      return NextResponse.json({
        isFollowing: false,
        // followingSince: null,
        message: "consider following @cashlessman.eth"
      });
    } else {
      console.log("Follows you");
      return NextResponse.json({
        isFollowing: true,
        // followingSince: followingData[0]?.followingSince,
        message: ""
      });
    }
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
