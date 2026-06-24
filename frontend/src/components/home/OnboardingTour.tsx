import { useEffect } from "react";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export function OnboardingTour() {
  useEffect(() => {
    // Only show to first-time visitors
    if (localStorage.getItem("hasSeenHomeTour")) return;
    
    // We want to give the page a moment to render before starting the tour.
    const timer = setTimeout(() => {
      const steps: any[] = [];

      if (document.getElementById("tour-book-service")) {
        steps.push({
          element: "#tour-book-service",
          popover: {
            title: "Find Help Instantly ⚡",
            description: "Click here to quickly jump to all available household services and book an expert in minutes.",
            side: "bottom",
            align: "start"
          }
        });
      }

      if (document.getElementById("services")) {
        steps.push({
          element: "#services",
          popover: {
            title: "Select a Service 🧹",
            description: "Browse and select the specific household help you need. We offer cleaning, cooking, laundry, and more.",
            side: "top",
            align: "center"
          }
        });
      }

      if (document.getElementById("tour-auth-buttons")) {
        steps.push({
          element: "#tour-auth-buttons",
          popover: {
            title: "Manage Your Account 👤",
            description: "Log in or sign up here to track your bookings, manage your wallet, and get personalized support.",
            side: "bottom",
            align: "end"
          }
        });
      }

      if (document.getElementById("tour-user-menu")) {
        steps.push({
          element: "#tour-user-menu",
          popover: {
            title: "Your Account Dashboard 👤",
            description: "Access your bookings, wallet, support, and account settings from here.",
            side: "bottom",
            align: "end"
          }
        });
      }

      if (document.getElementById("tour-wallet-balance")) {
        steps.push({
          element: "#tour-wallet-balance",
          popover: {
            title: "Your Premium Digital Wallet 💳",
            description: "View your available balance, add funds instantly, and see a summary of your recent spending.",
            side: "bottom",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-ai-booking")) {
        steps.push({
          element: "#tour-ai-booking",
          popover: {
            title: "AI Job Scope Assistant 🤖",
            description: "Describe your problem here! Our AI will automatically estimate the required duration, tools, and find the perfect expert for the job.",
            side: "top",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-bookings-list")) {
        steps.push({
          element: "#tour-bookings-list",
          popover: {
            title: "Track Your Bookings 📅",
            description: "View your past and active jobs. Click on an active booking to track your expert in real-time!",
            side: "top",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-support-contact")) {
        steps.push({
          element: "#tour-support-contact",
          popover: {
            title: "24/7 Support 💬",
            description: "Need help? Create a ticket and chat with our support team to get your issues resolved instantly.",
            side: "bottom",
            align: "end"
          }
        });
      }

      if (document.getElementById("tour-account-settings")) {
        steps.push({
          element: "#tour-account-settings",
          popover: {
            title: "Your Account Preferences ⚙️",
            description: "Update your personal details, secure your password, and manage your saved addresses here.",
            side: "right",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-expert-status")) {
        steps.push({
          element: "#tour-expert-status",
          popover: {
            title: "Operations Control Panel 🟢",
            description: "Toggle your status to 'Go Online' to start receiving live job dispatches in your area.",
            side: "bottom",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-expert-stats")) {
        steps.push({
          element: "#tour-expert-stats",
          popover: {
            title: "Performance & Earnings 💰",
            description: "Track your earnings, active jobs, and wallet balance. You can withdraw your available balance from the Wallet section.",
            side: "top",
            align: "start"
          }
        });
      }

      if (document.getElementById("tour-expert-jobs")) {
        steps.push({
          element: "#tour-expert-jobs",
          popover: {
            title: "Active Dispatch Feed ⚡",
            description: "When you are online, incoming job requests will appear here. Accept them to start working!",
            side: "top",
            align: "start"
          }
        });
      }

      // If no steps are relevant on the current page, don't start the tour yet
      if (steps.length === 0) return;

      const driverObj = driver({
        showProgress: true,
        allowClose: true,
        steps,
        onDestroyStarted: () => {
          localStorage.setItem("hasSeenHomeTour", "true");
          driverObj.destroy();
        }
      });
      
      driverObj.drive();
    }, 1500); // Wait 1.5 seconds for hero animations to settle

    return () => clearTimeout(timer);
  }, []);

  return null;
}
