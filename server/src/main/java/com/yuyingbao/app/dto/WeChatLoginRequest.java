package com.yuyingbao.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class WeChatLoginRequest {
	@NotBlank(message = "微信登录code不能为空")
	private String code; // wx.login code

	@Size(max = 50, message = "昵称长度不能超过50个字符")
	private String nickname;
	
	private String avatarUrl;
	
	// 用户性别：0-未知、1-男性、2-女性
	private Integer gender;
	
	// 用户所在国家
	private String country;
	
	// 用户所在省份
	private String province;
	
	// 用户所在城市
	private String city;
}


