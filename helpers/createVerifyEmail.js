const { BASE_URL } = process.env;

const createVerifyEmail = ({ email, verificationToken }) => {
  const verifyEmail = {
    to: email,
    subject: "Verify Email",
    html: `<a href="${BASE_URL}/api/users/verify/${verificationToken}" target="_blank">Click verify</a>`,
  };

  return verifyEmail;
};

export default createVerifyEmail;
