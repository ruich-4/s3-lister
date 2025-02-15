# S3 Directory Listing 🗂️

A lightweight, serverless web application for browsing S3 bucket contents with a modern, responsive interface.

## ✨ Features

- **Dynamic Directory Listing**: Browse S3 bucket contents seamlessly
- **Responsive Design**: Works perfectly on both desktop and mobile devices
- **Interactive Sorting**: Sort files by name, size, and modification date
- **Access Control**: Configurable private/public access policies
- **Breadcrumb Navigation**: Easy traversal through nested directories

## 🚀 Quick Start

### Prerequisites

- AWS Account (or another S3-compatible service like MinIO)
- S3 Bucket
- Cloudflare Workers account

### Installation

1. Clone the repository
2. Configure environment variables
3. Deploy to Cloudflare Workers

```bash
# Clone the repository
git clone https://github.com/ruich-4/s3-lister

# Navigate to project directory
cd s3-lister

# Set up environment variables
cp wrangler-example.toml wrangler.toml

# Deploy to Cloudflare Workers
wrangler deploy
```

## 🔧 Configuration

Configure the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `ACCESS_KEY_ID` | AWS IAM user access key | ✅ |
| `SECRET_ACCESS_KEY` | AWS IAM user secret key | ✅ |
| `BUCKET_NAME` | Target S3 bucket name | ✅ |
| `S3_ENDPOINT` | S3 bucket endpoint URL | ✅ |
| `REGION` | AWS region of the S3 bucket | ✅ |
| `TITLE` | Custom host name display | ❌ |
| `access_policy` | Access policy mode ('private'/'public') | ❌ |
| `download_url` | Base URL for public file downloads | ❌ |

## 🛠️ Customization

- **Access Control**: You can choose to make your S3 bucket contents public or private using the `access_policy` setting. The default is private.
- **Breadcrumb Navigation**: Allows for easy navigation within nested directories.

## 📦 Deployment

The application is built to run on Cloudflare Workers, which makes it lightweight, fast, and highly scalable.

### Deploy with Wrangler

To deploy to Cloudflare Workers, follow these steps:

1. Install [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) if you haven't already.
2. Configure your Cloudflare account and API token.
   - Log in to Wrangler using the command:  
   ```bash
   wrangler login
   ```
   For more details, check the [Wrangler login documentation](https://developers.cloudflare.com/workers/wrangler/commands/#login).
3. Deploy using the `wrangler deploy` command.

## ⚠️ Rate Limiting & Cost Considerations

Requests to S3-compatible services, including Amazon S3, MinIO, and others, are generally subject to limitations and can incur costs based on the number of requests. To avoid unexpected charges or abuse, we highly recommend setting up **rate limiting** and request restriction strategies for your Cloudflare Worker.

You can configure Cloudflare's [Rate limiting rules](https://developers.cloudflare.com/waf/rate-limiting-rules/) to prevent misuse and control traffic volume. These measures help mitigate the risk of excessive S3 requests leading to higher fees, regardless of whether you're using Amazon S3, MinIO, or another service.

Be sure to review your usage regularly and consider limiting access frequency to your Worker.

## 🌍 Acknowledgements

- [aws4fetch](https://github.com/mhart/aws4fetch)
- [Cloudflare Workers](https://workers.cloudflare.com/)


## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
