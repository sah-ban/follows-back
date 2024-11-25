import { init, fetchQueryWithPagination } from "@airstack/node";
import { NextRequest, NextResponse } from "next/server";


const apiKey = process.env.AIRSTACK_API_KEY;
if (!apiKey) {
  throw new Error("AIRSTACK_API_KEY is not defined");
}
init(apiKey);

console.log("Airstack API initialized for Null Followers count");

const nullFollowerQuery = `
query followBack($fid: Identity!) {
  SocialFollowings(
    input: {filter: {identity: {_eq: $fid}}, blockchain: ALL, limit: 200}
  ) {
    Following {
      followingAddress {
        socials {
          userId
          profileName
        }
        socialFollowers(
          input: {filter: {identity: {_eq: $fid}}, limit: 200}
        ) {
          Follower {
            followerSince
          }
        }
      }
    }
  }
}
`;
async function fetchUsername(fid: string) {
  const apiUrl = `https://fnames.farcaster.xyz/transfers?fid=${fid}`;
  try {
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (data && Array.isArray(data.transfers) && data.transfers.length > 0) {
      const transfer = data.transfers[0]; // Access the first transfer object
      const username = transfer.username; // Access the username
      return username || "Unknown";
    } else {
      console.warn("No transfers found for FID:", fid);
      return "Unknown";
    }
  } catch (error) {
    console.error("Error fetching username:", error);
    return "Unknown";
  }
}


// Function to send a Direct Cast
async function sendDirectCast(recipientFid: number, message: string) {
  const warpcastApiKey = process.env.WARPCAST_API_KEY;
  if (!warpcastApiKey) {
    throw new Error("WARPCAST_API_KEY is not defined");
  }

  const idempotencyKey = crypto.randomUUID(); // crypto module to generate a UUID

  const response = await fetch("https://api.warpcast.com/v2/ext-send-direct-cast", {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${warpcastApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      recipientFid,
      message,
      idempotencyKey,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("Failed to send Direct Cast:", error);
    throw new Error(`Warpcast API error: ${response.statusText}`);
  }

  console.log("Direct Cast sent successfully!");
}

export async function GET(req: NextRequest) {
  console.log(`Null Followers API route called at ${new Date().toISOString()}`);
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

  let nullFollowerCount = 0;
  let count = 0;
  let response: any;
//  const airstackUrl = `${appURL()}/api/profile;
  try {
    console.log(`Fetching Null Followers count from Airstack`);
    const username = await fetchUsername(fid);
    response = await fetchQueryWithPagination(nullFollowerQuery, { fid: `fc_fid:${fid}` });

    while (response) {
      const { data, error, hasNextPage, getNextPage } = response;

      if (error) {
        console.error("Airstack API error (null followers data):", error);

        await sendDirectCast(
          Number(fid),
          `[Automated]
There was an error getting data for your account, please respond If you want me to check it manually`
        );

        await sendDirectCast(
          Number(882408),
          `warpcast.com/${username}
 ${fid}`
        );

        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Check if data exists before accessing it
      if (data?.SocialFollowings?.Following) {
        // Count entries where Follower is null
        const currentPageNullFollowersCount = data.SocialFollowings.Following.filter(
          (followingEntry: any) =>
            followingEntry.followingAddress.socialFollowers?.Follower === null
        ).length;

        nullFollowerCount += currentPageNullFollowersCount;

        console.log(`Page ${count + 1} nullFollowerCount:`, currentPageNullFollowersCount);

        count++;
      }

      // If there's no next page, exit the loop
      if (!hasNextPage) {
        break;
      }

      // Fetch the next page
      response = await getNextPage();
    }

    console.log("Total nullFollowerCount:", nullFollowerCount);

    // Send the first Direct Cast with the null follower count message
    await sendDirectCast(
      Number(fid),
      `[Automated]
${nullFollowerCount} users are not Following you Back.`
    );
      // Send the second Direct Cast with the message "hello"
      await sendDirectCast(
        Number(fid),
       ` https://app.paycaster.co/api/frames/multi/559f2a0c-22ad-4bee-8cee-4fd8b7147094

Tip 420 $DEGEN in my recent cast or Pay via the Frame to get the list of users not following you back.`
      );
    return NextResponse.json({
      nullFollowerCount,
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    const isoString = new Date().toISOString();
    const dateTime = isoString.split('T'); // Splits into ['2024-11-23', '06:13:10.959Z']
    const formattedTime = `${dateTime[0]} ${dateTime[1].replace('Z', '')}`;
    console.log(formattedTime);

    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
