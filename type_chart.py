"""
属性克制系统
基于宝可梦/Tuxemon的属性克制关系
"""

# 属性克制表
# 攻击方 -> 防御方 -> 倍率
TYPE_CHART = {
    "normal": {
        "rock": 0.5,
        "ghost": 0,
        "steel": 0.5,
    },
    "fire": {
        "fire": 0.5,
        "water": 0.5,
        "grass": 2.0,
        "ice": 2.0,
        "bug": 2.0,
        "rock": 0.5,
        "dragon": 0.5,
        "steel": 2.0,
    },
    "water": {
        "fire": 2.0,
        "water": 0.5,
        "grass": 0.5,
        "ground": 2.0,
        "rock": 2.0,
        "dragon": 0.5,
    },
    "electric": {
        "water": 2.0,
        "electric": 0.5,
        "grass": 0.5,
        "ground": 0,
        "flying": 2.0,
        "dragon": 0.5,
    },
    "grass": {
        "fire": 0.5,
        "water": 2.0,
        "grass": 0.5,
        "poison": 0.5,
        "ground": 2.0,
        "flying": 0.5,
        "bug": 0.5,
        "rock": 2.0,
        "dragon": 0.5,
        "steel": 0.5,
    },
    "ice": {
        "fire": 0.5,
        "water": 0.5,
        "grass": 2.0,
        "ice": 0.5,
        "ground": 2.0,
        "flying": 2.0,
        "dragon": 2.0,
        "steel": 0.5,
    },
    "fighting": {
        "normal": 2.0,
        "ice": 2.0,
        "poison": 0.5,
        "flying": 0.5,
        "psychic": 0.5,
        "bug": 0.5,
        "rock": 2.0,
        "ghost": 0,
        "dark": 2.0,
        "steel": 2.0,
        "fairy": 0.5,
    },
    "poison": {
        "grass": 2.0,
        "fire": 0.5,
        "poison": 0.5,
        "ground": 0.5,
        "rock": 0.5,
        "ghost": 0.5,
        "steel": 0,
        "fairy": 2.0,
    },
    "ground": {
        "fire": 2.0,
        "electric": 2.0,
        "grass": 0.5,
        "poison": 2.0,
        "flying": 0,
        "bug": 0.5,
        "rock": 2.0,
        "steel": 2.0,
    },
    "flying": {
        "electric": 0.5,
        "grass": 2.0,
        "fighting": 2.0,
        "bug": 2.0,
        "rock": 0.5,
        "steel": 0.5,
    },
    "psychic": {
        "fighting": 2.0,
        "poison": 2.0,
        "psychic": 0.5,
        "dark": 0,
        "steel": 0.5,
    },
    "bug": {
        "fire": 0.5,
        "grass": 2.0,
        "fighting": 0.5,
        "poison": 0.5,
        "flying": 0.5,
        "psychic": 2.0,
        "ghost": 0.5,
        "dark": 2.0,
        "steel": 0.5,
        "fairy": 0.5,
    },
    "rock": {
        "fire": 2.0,
        "ice": 2.0,
        "fighting": 0.5,
        "ground": 0.5,
        "flying": 2.0,
        "bug": 2.0,
        "steel": 0.5,
    },
    "ghost": {
        "normal": 0,
        "psychic": 2.0,
        "ghost": 2.0,
        "dark": 0.5,
    },
    "dragon": {
        "dragon": 2.0,
        "steel": 0.5,
        "fairy": 0,
    },
    "dark": {
        "fighting": 0.5,
        "psychic": 2.0,
        "ghost": 2.0,
        "dark": 0.5,
        "fairy": 0.5,
    },
    "steel": {
        "fire": 0.5,
        "water": 0.5,
        "electric": 0.5,
        "ice": 2.0,
        "rock": 2.0,
        "steel": 0.5,
        "fairy": 2.0,
    },
    "fairy": {
        "fire": 0.5,
        "fighting": 2.0,
        "poison": 0.5,
        "dragon": 2.0,
        "dark": 2.0,
        "steel": 0.5,
    },
}


def calculate_type_multiplier(attack_types: list, defender_types: list) -> float:
    """
    计算属性克制倍率
    
    Args:
        attack_types: 攻击方属性列表
        defender_types: 防御方属性列表
    
    Returns:
        总倍率
    """
    multiplier = 1.0
    
    for attack_type in attack_types:
        for defender_type in defender_types:
            if attack_type in TYPE_CHART and defender_type in TYPE_CHART[attack_type]:
                multiplier *= TYPE_CHART[attack_type][defender_type]
    
    return multiplier


def get_type_effectiveness_text(multiplier: float) -> str:
    """
    获取属性效果文本
    
    Args:
        multiplier: 倍率
    
    Returns:
        效果文本
    """
    if multiplier == 0:
        return "无效"
    elif multiplier < 1:
        return "效果不佳"
    elif multiplier > 1:
        return "效果拔群"
    else:
        return "普通"


# 测试函数
if __name__ == "__main__":
    # 测试：火系攻击草系
    result = calculate_type_multiplier(["fire"], ["grass"])
    print(f"火克草: {result}x ({get_type_effectiveness_text(result)})")
    
    # 测试：水系攻击火系
    result = calculate_type_multiplier(["water"], ["fire"])
    print(f"水克火: {result}x ({get_type_effectiveness_text(result)})")
    
    # 测试：电系攻击地面系
    result = calculate_type_multiplier(["electric"], ["ground"])
    print(f"电打地: {result}x ({get_type_effectiveness_text(result)})")
