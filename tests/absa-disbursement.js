import http from "k6/http";
import { check } from "k6";

function generateRandomNonce(length) {
  const characters =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let nonce = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    nonce += characters.charAt(randomIndex);
  }

  return nonce;
}

function generateRandomAmount() {
  const min = 1;
  const max = 500;
  const decimalPlaces = 2;

  const random = Math.random() * (max - min) + min;
  const power = Math.pow(10, decimalPlaces);

  return Math.floor(random * power) / power;
}

export function setup() {
  // Step 1: Retrieve an access token using the client_credentials grant type
  const tokenEndpoint = "https://secure-staging.stitch.money/connect/token";
  const clientId = "YOUR CLIENT ID";
  const clientSecret = "YOUR CLIENT SECRET";
  const scope =
    "bankstatements accountholders balances transactions accounts client_disbursement";

  const data = {
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
  };

  const tokenResponse = http.post(tokenEndpoint, data);
  const tokenData = JSON.parse(tokenResponse.body);

  // Store the access token in the shared state to be used across iterations
  return {
    accessToken: tokenData.access_token,
  };
}

export let options = {
  iterations: 2000, // Number of iterations to run the test
  vus: 1, // Number of virtual users to simulate
};

export default function (data) {
  // Retrieve the access token from the shared state
  const accessToken = data.accessToken;

  // Step 2: Use the access token for authentication and run a GraphQL request
  const graphqlEndpoint = "https://api-staging.stitch.money/graphql";
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  // Variables with percentages of when they should be used
  const variableSets = [
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Miss K Absa Test",
        accountType: "current",
        accountNumber: "9051101420", // CLOSED ACCOUNTS
        bankId: "absa",
        type: "INSTANT",
        skipRecipientAccountVerification: true,
      },
      percentage: 5,
    },
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Miss K Absa Test",
        accountType: "current",
        accountNumber: "9051101420", // CLOSED ACCOUNTS
        bankId: "absa",
        type: "DEFAULT",
        skipRecipientAccountVerification: true,
      },
      percentage: 5,
    },
    {
      variables: {
        amount: {
          quantity: "30.2",
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mrs M Marais",
        accountType: "current",
        accountNumber: "4047734838", // HOLD ON ACCOUNT
        bankId: "absa",
        type: "INSTANT",
        skipRecipientAccountVerification: true,
      },
      percentage: 5,
    },
    {
      variables: {
        amount: {
          quantity: "30.2",
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mrs M Marais",
        accountType: "current",
        accountNumber: "4047734838", // HOLD ON ACCOUNT
        bankId: "absa",
        type: "DEFAULT",
        skipRecipientAccountVerification: true,
      },
      percentage: 5,
    },
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mr P Cronje",
        accountType: "current",
        accountNumber: "9051333140", // OPEN ACCOUNTS
        bankId: "absa",
        type: "INSTANT",
        skipRecipientAccountVerification: false,
      },
      percentage: 20,
    },
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mr P Cronje",
        accountType: "current",
        accountNumber: "9051333140", // OPEN ACCOUNTS
        bankId: "absa",
        type: "DEFAULT",
        skipRecipientAccountVerification: false,
      },
      percentage: 20,
    },
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mrs M Marais",
        accountType: "current",
        accountNumber: "9051548040", // OPEN ACCOUNTS
        bankId: "absa",
        type: "INSTANT",
        skipRecipientAccountVerification: false,
      },
      percentage: 20,
    },
    {
      variables: {
        amount: {
          quantity: generateRandomAmount().toString(),
          currency: "ZAR",
        },
        nonce: generateRandomNonce(10),
        beneficiaryReference: "absa-load-test",
        name: "Mrs M Marais",
        accountType: "current",
        accountNumber: "9051548040", // OPEN ACCOUNTS
        bankId: "absa",
        type: "DEFAULT",
        skipRecipientAccountVerification: false,
      },
      percentage: 20,
    },
  ];

  const query = `
  mutation CreateDisbursement(
    $amount: MoneyInput!,
    $type: DisbursementType!,
    $nonce: String!,
    $beneficiaryReference: String!,
    $name: String!,
    $accountNumber: String!,
    $accountType: AccountType!,
    $bankId: DisbursementBankBeneficiaryBankId!
    $skipRecipientAccountVerification: Boolean
  ) {
    clientDisbursementCreate(input: {
      amount: $amount,
      nonce: $nonce,
      bankBeneficiary: {
        name: $name,
        bankId: $bankId,
        accountNumber: $accountNumber,
        accountType: $accountType
      },
      disbursementType: $type,
      skipRecipientAccountVerification: $skipRecipientAccountVerification,
      beneficiaryReference: $beneficiaryReference}) {
      disbursement {
        id
        amount
        status {
          ... on DisbursementPending {
            __typename
            date
          }
          ... on DisbursementPaused {
            __typename
            date
            disbursementPausedReason
          }
          ... on DisbursementSubmitted {
            __typename
            date
          }
          ... on DisbursementCompleted {
            __typename
            date
            expectedSettlement
          }
          ... on DisbursementError {
            __typename
            date
            disbursementErrorReason
            disbursementErrorDescription
          }
          ... on DisbursementReversed {
                __typename
                date
                disbursementReversedDescription
                disbursementReversedReason
              }
        }
      }
    }
  }
  `;

  // Choose a variable set based on the iteration percentage
  let selectedVariables;
  let cumulativePercentage = 0;
  const randomPercentage = Math.random() * 100;

  for (const variableSet of variableSets) {
    cumulativePercentage += variableSet.percentage;
    if (randomPercentage <= cumulativePercentage) {
      selectedVariables = variableSet.variables;
      break;
    }
  }

  const payload = JSON.stringify({
    query: query,
    variables: selectedVariables,
  });

  const response = http.post(graphqlEndpoint, payload, { headers });

  // Perform checks on the response
  check(response, {
    "Status is 200": (r) => r.status === 200,
    // Add more checks as required
  });
}
