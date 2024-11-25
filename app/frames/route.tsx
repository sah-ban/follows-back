import { Button } from "frames.js/next";
import { frames } from "./frames";
import { appURL, formatNumber } from "../utils";


interface State {
  lastFid?: string;
}
interface FollowbackResponse {
  isFollowing: boolean; 
  message: string;
}
const frameHandler = frames(async (ctx) => {
  interface UserData {
    name: string;
    username: string;
    fid: string;
    followingCount:number;
    profileDisplayName: string;
    profileImageUrl: string;
  }

  let userData: UserData | null = null;
  let follows: FollowbackResponse | null = null;
  
  let error: string | null = null;
  let isLoading = false;

  const fetchUserData = async (fid: string) => {
    isLoading = true;
    try {
      const airstackUrl = `${appURL()}/api/profile?userId=${encodeURIComponent(
        fid
      )}`;
      const airstackResponse = await fetch(airstackUrl);
      if (!airstackResponse.ok) {
        throw new Error(
          `Airstack HTTP error! status: ${airstackResponse.status}`
        );
      }
      const airstackData = await airstackResponse.json();

      if (
        airstackData.userData.Socials.Social &&
        airstackData.userData.Socials.Social.length > 0
      ) {
        const social = airstackData.userData.Socials.Social[0];
        userData = {
          name: social.profileDisplayName || social.profileName || "Unknown",
          username: social.profileName || "unknown",
          fid: social.userId || "N/A",
          followingCount:social.followingCount || "N/A",
          profileDisplayName: social.profileDisplayName || "N/A",
          profileImageUrl:
            social.profileImageContentValue?.image?.extraSmall ||
            social.profileImage ||
            "",
        };
      } else {
        throw new Error("No user data found");
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      error = (err as Error).message;
    } finally {
      isLoading = false;
    }
  };

  const fetchFollowData = async (fid: string) => {
    try {
      const fbUrl = `${appURL()}/api/countFB?userId=${encodeURIComponent(
        fid
      )}`;
      const fbResponse = await fetch(fbUrl);
      if (!fbResponse.ok) {
        throw new Error(`Follow HTTP error! status: ${fbResponse.status}`);
      }
    } catch (err) {
      console.error("Error fetching Follow data:", err);
      error = (err as Error).message;
    }
    
  };
  const checkFollow = async (fid: string) => {
    try {
      const fUrl = `${appURL()}/api/follows?userId=${encodeURIComponent(
        fid
      )}`;
      const fResponse = await fetch(fUrl);
      if (!fResponse.ok) {
        throw new Error(`Follow HTTP error! status: ${fResponse.status}`);
      }
      follows = await fResponse.json();
      
    } catch (err) {
      console.error("Error fetching Follows data:", err);
      error = (err as Error).message;
    }
    
  };

  const extractFid = (url: string): string | null => {
    try {
      const parsedUrl = new URL(url);
      let fid = parsedUrl.searchParams.get("userfid");

      console.log("Extracted FID from URL:", fid);
      return fid;
    } catch (e) {
      console.error("Error parsing URL:", e);
      return null;
    }
  };

  let fid: string | null = null;

  if (ctx.message?.requesterFid) {
    fid = ctx.message.requesterFid.toString();
    console.log("Using requester FID:", fid);
  } else if (ctx.url) {
    fid = extractFid(ctx.url.toString());
    console.log("Extracted FID from URL:", fid);
  } else {
    console.log("No ctx.url available");
  }

  if (!fid && (ctx.state as State)?.lastFid) {
    fid = (ctx.state as State).lastFid ?? null;
    console.log("Using FID from state:", fid);
  }

  console.log("Final FID used:", fid);

  const shouldFetchData =
    fid && (!userData || (userData as UserData).fid !== fid);

if (shouldFetchData && fid) {
  fetchFollowData(fid); 
  await Promise.all([fetchUserData(fid), checkFollow(fid)]);
}

  const SplashScreen = () => (
    <div tw="flex w-full h-full bg-[#8660cc] text-white font-sans">
      <div tw= "flex flex-col m-auto items-center">
      <div tw="flex w-50 h-50 rounded-lg overflow-hidden">
      <img
      
      src="https://wrpcd.net/cdn-cgi/imagedelivery/BXluQx4ige9GuW0Ia56BHw/0eff1618-0790-4e82-fdf4-ebc3a2227400/original"
    />

      </div>
<div tw="flex flex-col text-5xl items-center mt-10">
<div tw="flex">Get Count of users</div>
      <div tw="flex">not Following you Back</div>
      <div tw="flex">in DC</div>


</div>
    </div>
    </div>
  );

  const ScoreScreen = () => {
    return (
      <div tw="flex flex-col w-full h-full bg-[#8660cc] text-white font-sans">
      
      <div tw="flex items-center justify-center mt-30">
            <img
              src={userData?.profileImageUrl}
              alt="Profile"
              tw="w-30 h-30 rounded-lg mr-4"
            />
            <div tw="flex flex-col">
              <span tw="flex text-5xl">{userData?.profileDisplayName}</span>
              <span tw="flex text-4xl">@{userData?.username}</span>
              

            </div>
       </div>
      
       <div tw="flex flex-col items-center">
       <span tw="flex text-5xl mt-12">You will get a DC from </span>
       <span tw="flex text-4xl">@cashlessman.eth soon... </span>

       <span tw="flex text-5xl mt-10">{follows?.message}</span>

       </div>

      </div>
    );
  };
  const shareText = encodeURIComponent(
    `Get the count of users not Following you Back in your DMs \n \nTool by @cashlessman.eth`
);
 
  const shareUrl = `https://warpcast.com/~/compose?text=${shareText}&embeds[]=https://followsback.vercel.app/frames`;

  const buttons = [];

  if (!userData) {
    buttons.push(
      <Button action="post" target={{ href: `${appURL()}?userfid=${fid}` }}>
        Get DC
      </Button>,
      <Button
        action="link"
        // Change the url here
        target={shareUrl}      >
        Share
      </Button>,
      <Button
        action="link"
        target="https://warpcast.com/cashlessman.eth"
      >
        Builder 👤
      </Button>
    );
  } else {
    buttons.push(
      <Button action="link" target={shareUrl}>
        Share
      </Button>,
         <Button
         action="link"
         target="https://warpcast.com/cashlessman.eth"
         >
        @cashlessman.eth
       </Button>
      
    );
  }

  return {
    image: fid && !error ? <ScoreScreen /> : <SplashScreen /> ,
    buttons: buttons,
  };
});

export const GET = frameHandler;
export const POST = frameHandler;
