package com.yuyingbao.app.model.entity;

import com.yuyingbao.app.model.enums.FamilyMemberRole;
import jakarta.persistence.*;
import lombok.*;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "family_members")
public class FamilyMember {
	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false)
	private Long familyId;

	@Column(nullable = false)
	private Long userId;

	@Column(nullable = false, length = 16)
	private String role; // CREATOR or MEMBER

	@Enumerated(EnumType.STRING)
	@Column(length = 32)
	private FamilyMemberRole memberRole; // 家庭成员具体角色（爸爸、妈妈等）

	@Column(nullable = false)
	private OffsetDateTime joinedAt;
	
	/**
	 * 获取成员角色的显示名称
	 * @return 角色显示名称
	 */
	public String getMemberRoleDisplayName() {
		if (this.memberRole != null) {
			return this.memberRole.getDisplayName();
		}
		// 如果没有设置具体角色，根据角色类型返回默认显示名称
		if ("CREATOR".equals(this.role)) {
			return "创建者";
		} else {
			return "成员";
		}
	}
}