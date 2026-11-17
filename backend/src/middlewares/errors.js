export function notFound(req,res){res.status(404).json({success:false,message:'Không tìm thấy API được yêu cầu.'})}
export function errors(err,req,res,next){console.error(err);if(res.headersSent)return next(err);const status=err.status||500;res.status(status).json({success:false,message:status===500?'Đã có lỗi máy chủ.':err.message, ...(err.details?{details:err.details}:{})})}
