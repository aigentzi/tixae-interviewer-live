// Test script to verify translation files are accessible and properly structured
const fs = require("fs");
const path = require("path");

const publicMessagesPath = path.join(__dirname, "../../public/messages");

console.log("🧪 Testing Translation Files...\n");

// Test 1: Check if public/messages directory exists
console.log("1. Checking public/messages directory...");
if (fs.existsSync(publicMessagesPath)) {
  console.log("✅ public/messages directory exists");
} else {
  console.log("❌ public/messages directory does not exist");
  process.exit(1);
}

// Test 2: Check if translation files exist
const files = ["inen.json", "ines.json"];
files.forEach((file) => {
  const filePath = path.join(publicMessagesPath, file);
  console.log(`\n2. Checking ${file}...`);

  if (fs.existsSync(filePath)) {
    console.log(`✅ ${file} exists`);

    try {
      const content = fs.readFileSync(filePath, "utf8");
      const data = JSON.parse(content);

      // Test structure
      if (data.onboarding) {
        console.log(`✅ ${file} has onboarding namespace`);

        // Test specific keys
        const requiredKeys = [
          "questionsHeader",
          "sampleQuestion1",
          "sampleQuestion2",
          "sampleQuestion3",
          "sampleQuestion4",
        ];

        const missingKeys = requiredKeys.filter((key) => !data.onboarding[key]);
        if (missingKeys.length === 0) {
          console.log(`✅ ${file} has all required question keys`);
        } else {
          console.log(`❌ ${file} missing keys: ${missingKeys.join(", ")}`);
        }

        // Test sample questions content
        console.log(`\n📝 Sample questions in ${file}:`);
        for (let i = 1; i <= 4; i++) {
          const key = `sampleQuestion${i}`;
          const question = data.onboarding[key];
          if (question) {
            console.log(`   ${i}. ${question}`);
          }
        }
      } else {
        console.log(`❌ ${file} missing onboarding namespace`);
      }
    } catch (error) {
      console.log(`❌ ${file} is not valid JSON: ${error.message}`);
    }
  } else {
    console.log(`❌ ${file} does not exist`);
  }
});

// Test 3: Test HTTP accessibility (simulate browser request)
console.log("\n3. Testing HTTP accessibility...");
console.log("   You can test these URLs in your browser:");
console.log(`   - http://localhost:3000/messages/inen.json`);
console.log(`   - http://localhost:3000/messages/ines.json`);

console.log("\n✅ Translation test completed!");
